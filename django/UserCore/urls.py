from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import hello, me, UserViewSet, UserRolesView

from rest_framework.routers import DefaultRouter 

router = DefaultRouter()

router.register(r'users', UserViewSet, basename="users")

urlpatterns = [
    # Router-backed resources
    path("", include(router.urls)),
    path("hello/", hello),                 # GET /api/hello
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", me),                       # GET /api/me/ (Bearer token),
    path('roles/', UserRolesView.as_view(), name='user-roles'),
]
