from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

from .services.ingo_client import (
    InGoClient,
    InGoClientError,
    map_company_base_to_project_payload,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def import_project(request):
    company_base = request.data.get("companyBase")
    project_payload = (
        map_company_base_to_project_payload(company_base)
        if isinstance(company_base, dict)
        else request.data
    )

    try:
        data = InGoClient().post_project(project_payload)
    except InGoClientError as exc:
        return Response({
            "error": {
                "code": exc.code,
                "message": str(exc),
            }
        }, status=exc.status_code)

    return Response(data, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def mock_get_token(request, tenant_name):
    expected_tenant = getattr(settings, "INGO_TENANT_NAME", "")

    if not expected_tenant:
        return Response({
            "error": {
                "code": "INGO_MOCK_CONFIGURATION_ERROR",
                "message": "Mock tenant must be configured.",
            }
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if tenant_name != expected_tenant:
        return Response({
            "error": {
                "code": "INGO_MOCK_INVALID_TENANT",
                "message": "Unknown tenant.",
            }
        }, status=status.HTTP_404_NOT_FOUND)

    user = authenticate(
        request=request,
        username=request.data.get("client_id"),
        password=request.data.get("client_secret"),
    )
    if user is None:
        return Response({
            "error": {
                "code": "INGO_MOCK_INVALID_CLIENT",
                "message": "Invalid client credentials.",
            }
        }, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({"access_token": str(refresh.access_token)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def mock_project_import(request):
    try:
        auth_result = JWTAuthentication().authenticate(request)
    except (AuthenticationFailed, InvalidToken):
        auth_result = None
    if auth_result is None:
        return Response({
            "error": {
                "code": "INGO_MOCK_UNAUTHORIZED",
                "message": "Missing or invalid bearer token.",
            }
        }, status=status.HTTP_401_UNAUTHORIZED)

    return Response({
        "projectSharedId": "mock-project-shared-id",
        "status": "imported",
        "received": request.data,
    })
