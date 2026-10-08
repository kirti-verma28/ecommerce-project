from django.contrib import admin
from django.db.models import F

from .models import (
    Address, Category, Order, OrderItem, Product, ProductImage, Review, UserProfile, WishlistItem,
)


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "mrp", "stock")
    list_filter = ("category",)
    search_fields = ("name", "description")
    inlines = [ProductImageInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "quantity", "price")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "total_amount", "payment_method", "created_at")
    list_filter = ("status", "payment_method")
    list_editable = ("status",)  # change the status right from the list
    inlines = [OrderItemInline]

    def save_model(self, request, obj, form, change):
        # If the admin cancels an order, put its items back into stock
        if change and "status" in form.changed_data and obj.status == "CANCELLED":
            previous_status = Order.objects.get(pk=obj.pk).status
            if previous_status != "CANCELLED":
                for item in obj.items.all():
                    Product.objects.filter(id=item.product_id).update(stock=F("stock") + item.quantity)
        super().save_model(request, obj, form, change)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "created_at")


admin.site.register(Category)
admin.site.register(UserProfile)
admin.site.register(OrderItem)
admin.site.register(Address)
admin.site.register(WishlistItem)