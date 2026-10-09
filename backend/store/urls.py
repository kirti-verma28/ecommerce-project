from django.urls import path
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


urlpatterns = [
    path('products/', views.ProductListView.as_view()),
    path('products/<int:pk>/', views.get_product),
    path('products/<int:pk>/similar/', views.get_similar_products),
    path('products/<int:pk>/reviews/', views.product_reviews),
    path('categories/', views.get_categories),
    path('cart/', views.get_cart),
    path('cart/add/', views.add_to_cart),
    path('cart/remove/', views.remove_from_cart),
    path('cart/update/', views.update_cart_quantity),
    path('orders/create/', views.create_order),
    path('addresses/', views.AddressListCreateView.as_view()),
    path('addresses/<int:pk>/', views.AddressDetailView.as_view()),
    path('orders/', views.my_orders),
    path('orders/<int:pk>/', views.order_detail),
    path('orders/<int:pk>/cancel/', views.cancel_order),
    path('wishlist/', views.get_wishlist),
    path('wishlist/toggle/', views.toggle_wishlist),
    path('register/', views.register_view),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('coupons/apply/', views.apply_coupon),
]