from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(Category, related_name='products', on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Original price. Leave empty if there is no discount.",
    )
    stock = models.PositiveIntegerField(default=10)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def discount_percent(self):
        if self.mrp and self.mrp > self.price:
            return int(round((self.mrp - self.price) / self.mrp * 100))
        return 0

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='products/gallery/')

    def __str__(self):
        return f"Image for {self.product.name}"


class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['product', 'user'], name='one_review_per_user_per_product'),
        ]

    def __str__(self):
        return f"{self.user.username} rated {self.product.name} {self.rating}/5"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.user.username


class Order(models.Model):
    STATUS_CHOICES = [
        ('PLACED', 'Placed'),
        ('CONFIRMED', 'Confirmed'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED', 'Delivered'),
        ('CANCELLED', 'Cancelled'),
    ]
    CANCELLABLE_STATUSES = ('PLACED', 'CONFIRMED')

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=30, default='', blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLACED')
    payment_method = models.CharField(max_length=10, default='COD')

    # Delivery details are copied into the order, so editing a saved address later
    # does not change old orders.
    ship_name = models.CharField(max_length=100, default='', blank=True)
    ship_phone = models.CharField(max_length=15, default='', blank=True)
    ship_address = models.TextField(default='', blank=True)
    ship_city = models.CharField(max_length=100, default='', blank=True)
    ship_state = models.CharField(max_length=100, default='', blank=True)
    ship_pincode = models.CharField(max_length=10, default='', blank=True)

    @property
    def can_cancel(self):
        return self.status in self.CANCELLABLE_STATUSES

    def __str__(self):
        return f"Order {self.id}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name}"


class Cart(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart {self.id} for {self.user}"

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

    @property
    def subtotal(self):
        return self.product.price * self.quantity

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"

class Address(models.Model):
    user = models.ForeignKey(User, related_name='addresses', on_delete=models.CASCADE)
    full_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15)
    address_line = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Only one default address per user
        if self.is_default:
            Address.objects.filter(user=self.user).exclude(pk=self.pk).update(is_default=False)

    def __str__(self):
        return f"{self.full_name}, {self.city}"


class WishlistItem(models.Model):
    user = models.ForeignKey(User, related_name='wishlist_items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'product'], name='unique_wishlist_item'),
        ]

    def __str__(self):
        return f"{self.user.username} likes {self.product.name}"

class Coupon(models.Model):
    DISCOUNT_TYPES = [('PERCENT', 'Percentage'), ('FLAT', 'Flat amount')]

    code = models.CharField(max_length=30, unique=True)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPES, default='PERCENT')
    value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Percent (like 10) or flat amount (like 200)")
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Upper limit for percentage coupons",
    )
    active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True, help_text="Leave empty for unlimited")
    used_count = models.PositiveIntegerField(default=0)

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def get_discount(self, subtotal):
        """Returns the discount for this subtotal. Raises ValueError (with a message for the customer)
        when the coupon cannot be used."""
        if not self.active:
            raise ValueError("This coupon is not active")
        if self.valid_until and self.valid_until < timezone.now():
            raise ValueError("This coupon has expired")
        if self.usage_limit is not None and self.used_count >= self.usage_limit:
            raise ValueError("This coupon has reached its usage limit")
        if subtotal < self.min_order_amount:
            raise ValueError(f"Add items worth ₹{self.min_order_amount} or more to use this coupon")

        if self.discount_type == 'PERCENT':
            discount = subtotal * self.value / Decimal('100')
            if self.max_discount is not None:
                discount = min(discount, self.max_discount)
        else:
            discount = self.value
        discount = min(discount, subtotal)  # never more than the cart total
        return Decimal(discount).quantize(Decimal('0.01'))

    def __str__(self):
        return self.code