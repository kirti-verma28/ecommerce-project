from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Product, ProductImage, Category, Cart, CartItem, Review, Address, Order, OrderItem

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image']


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = '__all__'

    def get_in_stock(self, obj):
        return obj.stock > 0

    # avg_rating and num_reviews come from the queryset (see product_queryset in views.py)
    def get_average_rating(self, obj):
        avg = getattr(obj, 'avg_rating', None)
        return round(avg, 1) if avg is not None else None

    def get_review_count(self, obj):
        return getattr(obj, 'num_reviews', 0)


class ReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'username', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'username', 'created_at']


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_price = serializers.DecimalField(source='product.price', max_digits=10, decimal_places=2, read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)

    class Meta:
        model = CartItem
        fields = '__all__'


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data.get('email', '')
        password = validated_data['password']
        user = User.objects.create_user(username=username, email=email, password=password)
        return user

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'full_name', 'phone', 'address_line', 'city', 'state', 'pincode', 'is_default']

    def validate_phone(self, value):
        if not value.isdigit() or len(value) < 10:
            raise serializers.ValidationError("Enter a valid phone number (at least 10 digits).")
        return value

    def validate_pincode(self, value):
        if not (value.isdigit() and len(value) == 6):
            raise serializers.ValidationError("Enter a valid 6-digit pincode.")
        return value


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'product_image', 'quantity', 'price', 'subtotal']

    def get_subtotal(self, obj):
        return obj.price * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_cancel = serializers.BooleanField(read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'created_at', 'subtotal', 'discount_amount', 'coupon_code', 'total_amount',
            'status', 'status_display', 'payment_method',
            'ship_name', 'ship_phone', 'ship_address', 'ship_city', 'ship_state', 'ship_pincode',
            'items', 'can_cancel',
        ]