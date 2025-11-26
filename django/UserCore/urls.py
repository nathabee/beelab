from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import hello,info, me,  UserViewSet, UserRolesView, demo_start, demo_reset,demo_status

from rest_framework.routers import DefaultRouter 

router = DefaultRouter()

router.register(r'users', UserViewSet, basename="users")

urlpatterns = [
    # Router-backed resources
    path("", include(router.urls)),
    path("hello/", hello),                 # GET /api/hello
    path("info/", info),                 # GET /api/info
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/demo/start/", demo_start, name="demo_start"),
    path("auth/demo/reset/", demo_reset, name="demo_reset"),
    path("auth/demo/status/", demo_status, name="demo_status"), 
    path("me/", me),                       # GET /api/me/ (Bearer token),
    path('roles/', UserRolesView.as_view(), name='user-roles'),
]
 
 
