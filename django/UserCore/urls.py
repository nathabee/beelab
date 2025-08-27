from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import hello, me

urlpatterns = [
    path("hello/", hello),                 # GET /api/hello
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", me),                       # GET /api/me/ (Bearer token)
]
