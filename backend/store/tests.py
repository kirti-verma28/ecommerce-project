from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from .models import Address, Cart, CartItem, Category, Coupon, Order, Product, Review

ADDRESS = {
    "full_name": "Bob",
    "phone": "9123456780",
    "address_line": "5 Park Road",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
}


class BaseTestCase(APITestCase):
    """Creates two users, one category, two products and a delivery address for alice."""

    def setUp(self):
        self.alice = User.objects.create_user(username="alice", password="Str0ng-pass!")
        self.bob = User.objects.create_user(username="bob", password="Str0ng-pass!")
        self.category = Category.objects.create(name="Furniture", slug="furniture")
        self.table = Product.objects.create(
            category=self.category,
            name="Wooden Table",
            price=Decimal("1000.00"),
            mrp=Decimal("1250.00"),
            stock=5,
        )
        self.chair = Product.objects.create(
            category=self.category,
            name="Chair",
            price=Decimal("400.00"),
            stock=2,
        )
        self.address = Address.objects.create(
            user=self.alice,
            full_name="Alice",
            phone="9876543210",
            address_line="12 Main Street",
            city="Delhi",
            state="Delhi",
            pincode="110001",
        )
        self.client.force_authenticate(user=self.alice)

    def put_in_cart(self, product, quantity=1, user=None):
        cart, _ = Cart.objects.get_or_create(user=user or self.alice)
        return CartItem.objects.create(cart=cart, product=product, quantity=quantity)

    def place_order(self, **extra):
        payload = {"address_id": self.address.id, "payment_method": "COD", **extra}
        return self.client.post("/api/orders/create/", payload, format="json")


class AuthTests(APITestCase):
    def test_register_then_login(self):
        res = self.client.post(
            "/api/register/",
            {"username": "carol", "email": "c@example.com", "password": "Str0ng-pass!", "password2": "Str0ng-pass!"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)

        res = self.client.post(
            "/api/token/", {"username": "carol", "password": "Str0ng-pass!"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())
        self.assertIn("refresh", res.json())

    def test_register_rejects_different_passwords(self):
        res = self.client.post(
            "/api/register/",
            {"username": "dave", "password": "Str0ng-pass!", "password2": "other-pass"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_wrong_password_cannot_login(self):
        User.objects.create_user(username="erin", password="Str0ng-pass!")
        res = self.client.post("/api/token/", {"username": "erin", "password": "wrong"}, format="json")
        self.assertEqual(res.status_code, 401)

    def test_refresh_token_gives_a_new_access_token(self):
        User.objects.create_user(username="frank", password="Str0ng-pass!")
        tokens = self.client.post(
            "/api/token/", {"username": "frank", "password": "Str0ng-pass!"}, format="json"
        ).json()
        res = self.client.post("/api/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.json())

    def test_cart_needs_login(self):
        self.assertEqual(self.client.get("/api/cart/").status_code, 401)


class ProductTests(BaseTestCase):
    def names(self, query):
        data = self.client.get(f"/api/products/?{query}").json()
        return [p["name"] for p in data["results"]]

    def test_products_are_public(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/products/").status_code, 200)

    def test_list_is_paginated(self):
        data = self.client.get("/api/products/?page_size=1").json()
        self.assertEqual(data["count"], 2)
        self.assertEqual(len(data["results"]), 1)
        self.assertIsNotNone(data["next"])

    def test_search_looks_at_name_and_category(self):
        self.assertEqual(self.names("search=table"), ["Wooden Table"])
        self.assertEqual(len(self.names("search=furniture")), 2)

    def test_filter_by_category(self):
        lighting = Category.objects.create(name="Lighting", slug="lighting")
        Product.objects.create(category=lighting, name="Lamp", price=Decimal("300.00"), stock=3)
        self.assertEqual(self.names("category=lighting"), ["Lamp"])

    def test_filter_by_price(self):
        self.assertEqual(self.names("min_price=500"), ["Wooden Table"])
        self.assertEqual(self.names("max_price=500"), ["Chair"])

    def test_sort_by_price(self):
        self.assertEqual(self.names("ordering=price"), ["Chair", "Wooden Table"])
        self.assertEqual(self.names("ordering=-price"), ["Wooden Table", "Chair"])

    def test_detail_shows_discount_and_stock(self):
        data = self.client.get(f"/api/products/{self.table.id}/").json()
        self.assertEqual(data["discount_percent"], 20)
        self.assertTrue(data["in_stock"])

    def test_out_of_stock_flag(self):
        self.chair.stock = 0
        self.chair.save()
        data = self.client.get(f"/api/products/{self.chair.id}/").json()
        self.assertFalse(data["in_stock"])

    def test_unknown_product_gives_404(self):
        self.assertEqual(self.client.get("/api/products/9999/").status_code, 404)

    def test_similar_products_do_not_include_the_product_itself(self):
        data = self.client.get(f"/api/products/{self.table.id}/similar/").json()
        self.assertEqual([p["name"] for p in data], ["Chair"])


class CartTests(BaseTestCase):
    def add(self, product):
        return self.client.post("/api/cart/add/", {"product_id": product.id}, format="json")

    def test_add_to_cart(self):
        self.assertEqual(self.add(self.table).status_code, 200)
        self.add(self.table)
        self.assertEqual(CartItem.objects.get(cart__user=self.alice).quantity, 2)

    def test_cannot_add_more_than_stock(self):
        self.add(self.chair)
        self.add(self.chair)
        res = self.add(self.chair)  # the chair has only 2 in stock
        self.assertEqual(res.status_code, 400)
        self.assertIn("Only 2 left", res.json()["error"])
        self.assertEqual(CartItem.objects.get(cart__user=self.alice).quantity, 2)

    def test_cannot_add_out_of_stock_product(self):
        self.chair.stock = 0
        self.chair.save()
        self.assertEqual(self.add(self.chair).status_code, 400)

    def test_update_quantity(self):
        item = self.put_in_cart(self.table)
        res = self.client.post("/api/cart/update/", {"item_id": item.id, "quantity": 3}, format="json")
        self.assertEqual(res.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 3)

    def test_update_quantity_above_stock_is_rejected(self):
        item = self.put_in_cart(self.table)
        res = self.client.post("/api/cart/update/", {"item_id": item.id, "quantity": 6}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_quantity_below_one_removes_the_item(self):
        item = self.put_in_cart(self.table)
        self.client.post("/api/cart/update/", {"item_id": item.id, "quantity": 0}, format="json")
        self.assertFalse(CartItem.objects.filter(id=item.id).exists())

    def test_remove_item(self):
        item = self.put_in_cart(self.table)
        self.client.post("/api/cart/remove/", {"item_id": item.id}, format="json")
        self.assertFalse(CartItem.objects.filter(id=item.id).exists())

    def test_user_cannot_touch_another_users_cart_item(self):
        bobs_item = self.put_in_cart(self.table, user=self.bob)
        res = self.client.post("/api/cart/update/", {"item_id": bobs_item.id, "quantity": 4}, format="json")
        self.assertEqual(res.status_code, 404)
        self.client.post("/api/cart/remove/", {"item_id": bobs_item.id}, format="json")
        bobs_item.refresh_from_db()  # still there
        self.assertEqual(bobs_item.quantity, 1)


class OrderTests(BaseTestCase):
    def test_placing_an_order_reduces_stock_and_clears_the_cart(self):
        self.put_in_cart(self.table, 2)
        res = self.place_order()
        self.assertEqual(res.status_code, 200)

        order = Order.objects.get(id=res.json()["order_id"])
        self.assertEqual(order.total_amount, Decimal("2000.00"))
        self.assertEqual(order.status, "PLACED")
        self.assertEqual(order.ship_name, "Alice")
        self.assertEqual(order.items.count(), 1)

        self.table.refresh_from_db()
        self.assertEqual(self.table.stock, 3)
        self.assertFalse(CartItem.objects.filter(cart__user=self.alice).exists())

    def test_cannot_order_more_than_stock(self):
        self.put_in_cart(self.chair, 2)
        self.chair.stock = 1
        self.chair.save()
        res = self.place_order()
        self.assertEqual(res.status_code, 400)
        self.assertIn("Only 1 left", res.json()["error"])
        self.assertEqual(Order.objects.count(), 0)
        self.chair.refresh_from_db()
        self.assertEqual(self.chair.stock, 1)

    def test_empty_cart_is_rejected(self):
        self.assertEqual(self.place_order().status_code, 400)

    def test_delivery_address_is_required(self):
        self.put_in_cart(self.table)
        res = self.client.post("/api/orders/create/", {"payment_method": "COD"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_cannot_use_someone_elses_address(self):
        bobs_address = Address.objects.create(user=self.bob, **ADDRESS)
        self.put_in_cart(self.table)
        res = self.client.post(
            "/api/orders/create/",
            {"address_id": bobs_address.id, "payment_method": "COD"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_online_payment_is_not_available(self):
        self.put_in_cart(self.table)
        self.assertEqual(self.place_order(payment_method="ONLINE").status_code, 400)

    def test_cancelling_puts_stock_back(self):
        self.put_in_cart(self.table, 2)
        order_id = self.place_order().json()["order_id"]

        res = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "CANCELLED")
        self.table.refresh_from_db()
        self.assertEqual(self.table.stock, 5)

        # A second cancel is not allowed
        self.assertEqual(self.client.post(f"/api/orders/{order_id}/cancel/").status_code, 400)

    def test_shipped_order_cannot_be_cancelled(self):
        self.put_in_cart(self.table)
        order_id = self.place_order().json()["order_id"]
        Order.objects.filter(id=order_id).update(status="SHIPPED")
        self.assertEqual(self.client.post(f"/api/orders/{order_id}/cancel/").status_code, 400)

    def test_orders_are_private(self):
        self.put_in_cart(self.table)
        order_id = self.place_order().json()["order_id"]

        self.client.force_authenticate(user=self.bob)
        self.assertEqual(self.client.get(f"/api/orders/{order_id}/").status_code, 404)
        self.assertEqual(self.client.post(f"/api/orders/{order_id}/cancel/").status_code, 404)
        self.assertEqual(self.client.get("/api/orders/").json(), [])


class CouponTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.coupon = Coupon.objects.create(
            code="WELCOME10",
            discount_type="PERCENT",
            value=Decimal("10"),
            min_order_amount=Decimal("500"),
            max_discount=Decimal("200"),
        )

    def apply(self, code="WELCOME10"):
        return self.client.post("/api/coupons/apply/", {"code": code}, format="json")

    def test_percentage_discount(self):
        self.put_in_cart(self.table, 1)  # 1000, so 10% is 100
        res = self.apply()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Decimal(str(res.json()["discount"])), Decimal("100.00"))

    def test_discount_is_capped_by_max_discount(self):
        self.put_in_cart(self.table, 3)  # 3000, 10% is 300, but the cap is 200
        self.assertEqual(Decimal(str(self.apply().json()["discount"])), Decimal("200.00"))

    def test_flat_coupon(self):
        Coupon.objects.create(code="FLAT150", discount_type="FLAT", value=Decimal("150"))
        self.put_in_cart(self.chair, 1)
        res = self.apply("flat150")  # lower case is fine
        self.assertEqual(Decimal(str(res.json()["discount"])), Decimal("150.00"))

    def test_minimum_order_amount(self):
        self.put_in_cart(self.chair, 1)  # 400 is below the 500 minimum
        res = self.apply()
        self.assertEqual(res.status_code, 400)
        self.assertIn("worth", res.json()["error"])

    def test_unknown_code(self):
        self.put_in_cart(self.table)
        self.assertEqual(self.apply("NOPE").status_code, 400)

    def test_inactive_coupon(self):
        self.coupon.active = False
        self.coupon.save()
        self.put_in_cart(self.table)
        self.assertEqual(self.apply().status_code, 400)

    def test_usage_limit(self):
        self.coupon.usage_limit = 1
        self.coupon.used_count = 1
        self.coupon.save()
        self.put_in_cart(self.table)
        res = self.apply()
        self.assertEqual(res.status_code, 400)
        self.assertIn("usage limit", res.json()["error"])

    def test_empty_cart(self):
        self.assertEqual(self.apply().status_code, 400)

    def test_order_with_coupon(self):
        self.put_in_cart(self.table, 1)
        res = self.place_order(coupon_code="welcome10")
        self.assertEqual(res.status_code, 200)

        order = Order.objects.get(id=res.json()["order_id"])
        self.assertEqual(order.subtotal, Decimal("1000.00"))
        self.assertEqual(order.discount_amount, Decimal("100.00"))
        self.assertEqual(order.total_amount, Decimal("900.00"))
        self.assertEqual(order.coupon_code, "WELCOME10")
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.used_count, 1)

    def test_cancelling_gives_the_coupon_use_back(self):
        self.put_in_cart(self.table, 1)
        order_id = self.place_order(coupon_code="WELCOME10").json()["order_id"]
        self.client.post(f"/api/orders/{order_id}/cancel/")
        self.coupon.refresh_from_db()
        self.assertEqual(self.coupon.used_count, 0)

    def test_invalid_coupon_stops_the_order(self):
        self.put_in_cart(self.table, 1)
        res = self.place_order(coupon_code="NOPE")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.table.refresh_from_db()
        self.assertEqual(self.table.stock, 5)


class ReviewTests(BaseTestCase):
    def url(self):
        return f"/api/products/{self.table.id}/reviews/"

    def test_create_review(self):
        res = self.client.post(self.url(), {"rating": 4, "comment": "Solid table"}, format="json")
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["username"], "alice")

    def test_second_review_by_the_same_user_updates_the_first(self):
        self.client.post(self.url(), {"rating": 4}, format="json")
        self.client.post(self.url(), {"rating": 2, "comment": "Changed my mind"}, format="json")
        self.assertEqual(Review.objects.count(), 1)
        self.assertEqual(Review.objects.get().rating, 2)

    def test_rating_must_be_between_1_and_5(self):
        for bad_rating in (0, 6):
            res = self.client.post(self.url(), {"rating": bad_rating}, format="json")
            self.assertEqual(res.status_code, 400)

    def test_login_is_needed_to_write_a_review(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(self.url(), {"rating": 5}, format="json").status_code, 401)

    def test_reviews_can_be_read_without_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self.url()).status_code, 200)

    def test_average_rating_and_count(self):
        Review.objects.create(product=self.table, user=self.alice, rating=5)
        Review.objects.create(product=self.table, user=self.bob, rating=3)
        data = self.client.get(f"/api/products/{self.table.id}/").json()
        self.assertEqual(data["average_rating"], 4.0)
        self.assertEqual(data["review_count"], 2)


class WishlistTests(BaseTestCase):
    def toggle(self, product):
        return self.client.post("/api/wishlist/toggle/", {"product_id": product.id}, format="json")

    def test_toggle_adds_and_removes(self):
        self.assertTrue(self.toggle(self.table).json()["in_wishlist"])
        ids = [p["id"] for p in self.client.get("/api/wishlist/").json()]
        self.assertEqual(ids, [self.table.id])

        self.assertFalse(self.toggle(self.table).json()["in_wishlist"])
        self.assertEqual(self.client.get("/api/wishlist/").json(), [])

    def test_wishlist_needs_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/wishlist/").status_code, 401)

    def test_unknown_product(self):
        res = self.client.post("/api/wishlist/toggle/", {"product_id": 9999}, format="json")
        self.assertEqual(res.status_code, 404)


class AddressTests(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.client.force_authenticate(user=self.bob)  # bob has no address yet

    def create(self, **extra):
        return self.client.post("/api/addresses/", {**ADDRESS, **extra}, format="json")

    def test_first_address_becomes_the_default(self):
        res = self.create()
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.json()["is_default"])

    def test_only_one_default_address(self):
        first = self.create().json()["id"]
        second = self.create(is_default=True).json()["id"]
        self.assertFalse(Address.objects.get(id=first).is_default)
        self.assertTrue(Address.objects.get(id=second).is_default)

    def test_deleting_the_default_promotes_another_address(self):
        first = self.create().json()["id"]
        second = self.create().json()["id"]  # not the default
        self.assertEqual(self.client.delete(f"/api/addresses/{first}/").status_code, 204)
        self.assertTrue(Address.objects.get(id=second).is_default)

    def test_pincode_and_phone_are_validated(self):
        self.assertEqual(self.create(pincode="123").status_code, 400)
        self.assertEqual(self.create(phone="123").status_code, 400)

    def test_addresses_are_private(self):
        res = self.client.get(f"/api/addresses/{self.address.id}/")  # this one belongs to alice
        self.assertEqual(res.status_code, 404)