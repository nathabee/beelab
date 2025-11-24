 # django/PomoloBeeCore/urls.py
from django.urls import path, include
from django.http import JsonResponse

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    FieldViewSet, FruitViewSet, LocationListView,
    EstimationView, ImageDetailView, ImageDeleteView,
    ImageView, RetryProcessingView, ImageListView,
    MLResultView, MLVersionView, FieldEstimationListView,
    ManualEstimationView,FarmViewSet
)

# If you prefer no trailing slash on router routes, use: DefaultRouter(trailing_slash=False)
router = DefaultRouter()
router.register(r"fields", FieldViewSet, basename="fields")
router.register(r"fruits", FruitViewSet, basename="fruits") 
router.register(r"farms", FarmViewSet, basename="farms")

urlpatterns = [ 
    # Router-backed resources
    path("", include(router.urls)),

    # Non-router endpoints
    path("locations/", LocationListView.as_view(), name="locations"),
    path("images/", ImageView.as_view(), name="image-upload"),  # POST /api/images/
    path("manual_estimation/", ManualEstimationView.as_view(), name="manual-estimation"),
    path("images/list/", ImageListView.as_view(), name="image-list"),
    path("images/<int:image_id>/details/", ImageDetailView.as_view(), name="image-detail"),
    path("images/<int:image_id>/", ImageDeleteView.as_view(), name="image-delete"),
    path("images/<int:image_id>/estimations/", EstimationView.as_view(), name="image-estimations"),
    path("fields/<int:field_id>/estimations/", FieldEstimationListView.as_view(), name="field-estimations"),
    path("images/<int:image_id>/ml_result/", MLResultView.as_view(), name="ml-result"),
    path("retry_processing/", RetryProcessingView.as_view(), name="retry-processing"),
    path("ml/version/", MLVersionView.as_view(), name="ml-version"),
]
