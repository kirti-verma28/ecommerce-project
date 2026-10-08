from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Avg, Count, F
from rest_framework import filters, generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import (
    Address, Cart, CartItem, Category, Order, OrderItem, Product, Review, WishlistItem,
)
from .serializers import (
    AddressSerializer,
    CartItemSerializer,
    CartSerializer,
    CategorySerializer,
    OrderSerializer,
    ProductSerializer,
    RegisterSerializer,
    ReviewSerializer,
    UserSerializer,
)



def product_queryset():
    """Products with category, gallery images and rating info loaded efficiently."""
    return (
        Product.objects.select_related("category")
        .prefetch_related("images")
        .annotate(avg_rating=Avg("reviews__rating"), num_reviews=Count("reviews"))
    )


class ProductPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


class ProductListView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    pagination_class = ProductPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "category__name"]
    ordering_fields = ["price", "created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = product_queryset()
        params = self.request.query_params

        category = params.get("category")
        if category:
            qs = qs.filter(category__slug=category)

        for key, lookup in (("min_price", "price__gte"), ("max_price", "price__lte")):
            value = params.get(key)
            if value:
                try:
                    qs = qs.filter(**{lookup: Decimal(value)})
                except InvalidOperation:
                    pass  # ignore a price that is not a number
        return qs


@api_view(['GET'])
def get_product(request, pk):
    try:
        product = product_queryset().get(id=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)
    return Response(ProductSerializer(product, context={'request': request}).data)


@api_view(['GET'])
def get_similar_products(request, pk):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)
    similar = (
        product_queryset()
        .filter(category=product.category)
        .exclude(id=pk)
        .order_by('-created_at')[:4]
    )
    return Response(ProductSerializer(similar, many=True, context={'request': request}).data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticatedOrReadOnly])
def product_reviews(request, pk):
    try:
        product = Product.objects.get(id=pk)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=404)

    if request.method == 'GET':
        reviews = product.reviews.select_related('user')
        return Response(ReviewSerializer(reviews, many=True).data)

    # POST: create the review, or update it if this user already reviewed the product
    serializer = ReviewSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    review, _ = Review.objects.update_or_create(
        product=product,
        user=request.user,
        defaults={
            'rating': serializer.validated_data['rating'],
            'comment': serializer.validated_data.get('comment', ''),
        },
    )
    return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def get_categories(request):
    categories = Category.objects.all()
    serializer = CategorySerializer(categories, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cart(request):
    cart, created = Cart.objects.get_or_create(user=request.user)
    serializer = CartSerializer(cart)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_to_cart(request):
    product_id = request.data.get('product_id')
    try:
        product = Product.objects.get(id=product_id)
    except (Product.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Product not found'}, status=404)

    if product.stock < 1:
        return Response({'error': 'This product is out of stock'}, status=400)

    cart, _ = Cart.objects.get_or_create(user=request.user)
    item, created = CartItem.objects.get_or_create(cart=cart, product=product)
    if not created:
        if item.quantity + 1 > product.stock:
            return Response({'error': f'Only {product.stock} left in stock'}, status=400)
        item.quantity += 1
        item.save()
    return Response({'message': 'Product added to cart', 'cart': CartSerializer(cart).data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def remove_from_cart(request):
    item_id = request.data.get('item_id')
    # Only the owner of the cart can remove its items
    CartItem.objects.filter(id=item_id, cart__user=request.user).delete()
    return Response({'message': 'Item removed from cart'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_cart_quantity(request):
    item_id = request.data.get('item_id')
    quantity = request.data.get('quantity')

    if not item_id or quantity is None:
        return Response({'error': 'Item ID and quantity are required'}, status=400)

    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return Response({'error': 'Quantity must be a number'}, status=400)

    try:
        item = CartItem.objects.select_related('product').get(id=item_id, cart__user=request.user)
    except CartItem.DoesNotExist:
        return Response({'error': 'Cart item not found'}, status=404)

    if quantity < 1:
        item.delete()
        return Response({'message': 'Item removed from cart'})

    if quantity > item.product.stock:
        return Response({'error': f'Only {item.product.stock} left in stock'}, status=400)

    item.quantity = quantity
    item.save()
    return Response(CartItemSerializer(item).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    payment_method = request.data.get('payment_method', 'COD')
    if payment_method != 'COD':
        return Response(
            {'error': 'Online payment is not available yet. Please choose Cash on Delivery.'},
            status=400,
        )

    try:
        address = Address.objects.get(id=request.data.get('address_id'), user=request.user)
    except (Address.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Please select a delivery address'}, status=400)

    with transaction.atomic():
        cart, _ = Cart.objects.get_or_create(user=request.user)
        items = list(cart.items.select_related('product'))
        if not items:
            return Response({'error': 'Cart is empty'}, status=400)

        # Lock these product rows, so two buyers cannot take the last item at the same time
        products = {
            p.id: p
            for p in Product.objects.select_for_update().filter(id__in=[i.product_id for i in items])
        }

        for item in items:
            product = products[item.product_id]
            if item.quantity > product.stock:
                return Response(
                    {'error': f'Only {product.stock} left of "{product.name}". Please update your cart.'},
                    status=400,
                )

        total = sum(products[i.product_id].price * i.quantity for i in items)
        order = Order.objects.create(
            user=request.user,
            total_amount=total,
            payment_method='COD',
            ship_name=address.full_name,
            ship_phone=address.phone,
            ship_address=address.address_line,
            ship_city=address.city,
            ship_state=address.state,
            ship_pincode=address.pincode,
        )

        for item in items:
            product = products[item.product_id]
            OrderItem.objects.create(
                order=order,
                product=product,
                quantity=item.quantity,
                price=product.price,
            )
            product.stock -= item.quantity
            product.save(update_fields=['stock'])

        cart.items.all().delete()

    return Response({'message': 'Order created successfully', 'order_id': order.id})

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {"message": "User created successfully", "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ---------- Addresses ----------

class AddressListCreateView(generics.ListCreateAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        has_addresses = Address.objects.filter(user=self.request.user).exists()
        wants_default = serializer.validated_data.get('is_default', False)
        # The first address becomes the default automatically
        serializer.save(user=self.request.user, is_default=wants_default or not has_addresses)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        was_default = instance.is_default
        user = instance.user
        instance.delete()
        if was_default:
            next_address = Address.objects.filter(user=user).first()
            if next_address:
                next_address.is_default = True
                next_address.save()


# ---------- Orders ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    orders = (
        Order.objects.filter(user=request.user)
        .prefetch_related('items__product')
        .order_by('-created_at')
    )
    return Response(OrderSerializer(orders, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_detail(request, pk):
    try:
        order = Order.objects.prefetch_related('items__product').get(id=pk, user=request.user)
    except Order.DoesNotExist:
        return Response({'error': 'Order not found'}, status=404)
    return Response(OrderSerializer(order, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_order(request, pk):
    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(id=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        if not order.can_cancel:
            return Response({'error': 'This order can no longer be cancelled'}, status=400)

        # Put the items back into stock
        for item in order.items.all():
            Product.objects.filter(id=item.product_id).update(stock=F('stock') + item.quantity)

        order.status = 'CANCELLED'
        order.save(update_fields=['status'])

    return Response(OrderSerializer(order, context={'request': request}).data)


# ---------- Wishlist ----------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_wishlist(request):
    # Newest first (WishlistItem is ordered by -created_at)
    ids = list(WishlistItem.objects.filter(user=request.user).values_list('product_id', flat=True))
    products = {p.id: p for p in product_queryset().filter(id__in=ids)}
    ordered = [products[i] for i in ids if i in products]
    return Response(ProductSerializer(ordered, many=True, context={'request': request}).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_wishlist(request):
    try:
        product = Product.objects.get(id=request.data.get('product_id'))
    except (Product.DoesNotExist, ValueError, TypeError):
        return Response({'error': 'Product not found'}, status=404)

    item, created = WishlistItem.objects.get_or_create(user=request.user, product=product)
    if not created:
        item.delete()
    return Response({'in_wishlist': created})