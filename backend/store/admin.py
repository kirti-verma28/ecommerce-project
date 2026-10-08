from django.contrib import admin
from .models import Category, Product, ProductImage, Review, UserProfile, Order, OrderItem


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "price", "mrp", "stock")
    list_filter = ("category",)
    search_fields = ("name", "description")
    inlines = [ProductImageInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("product", "user", "rating", "created_at")


admin.site.register(Category)
admin.site.register(UserProfile)
admin.site.register(Order)
admin.site.register(OrderItem)