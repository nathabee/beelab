import hashlib
from datetime import datetime

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

from .models import InGoImportedProject
from .services.ingo_client import (
    InGoClient,
    InGoClientError,
    map_company_base_to_project_payload,
)


REQUIRED_PROJECT_FIELDS = [
    ("projectNumber", str),
    ("projectName", str),
    ("location.address.streetName", str),
    ("location.address.city", str),
    ("location.address.postalCode", str),
    ("location.address.country", str),
    ("localContact.localContactName", str),
    ("localContact.localContactPhone", str),
    ("startDate", str),
    ("nuLevel", int),
]

PROJECT_FIELD_MAX_LENGTHS = {
    "projectNumber": 150,
    "projectName": 150,
    "location.address.streetName": 100,
    "location.address.streetNumber": 10,
    "location.address.city": 100,
    "location.address.state": 50,
    "location.address.postalCode": 15,
    "location.address.country": 3,
    "location.coordinates": 50,
    "localContact.localContactName": 300,
    "localContact.localContactPhone": 50,
}


def get_nested(data, path):
    current = data

    for part in path.split("."):
        if not isinstance(current, dict) or part not in current:
            return None

        current = current[part]

    return current


def make_project_shared_id(project_number):
    normalized = str(project_number).strip()
    digest = hashlib.sha1(normalized.encode("utf-8")).hexdigest()[:12]
    return f"mock-{normalized}-{digest}"


def validate_project_payload(data):
    errors = []

    if not isinstance(data, dict):
        return [{
            "field": "$",
            "message": "Payload must be a JSON object.",
        }]

    for path, expected_type in REQUIRED_PROJECT_FIELDS:
        value = get_nested(data, path)

        if value is None or value == "":
            errors.append({
                "field": path,
                "message": "Field is required.",
            })
            continue

        if expected_type is int and isinstance(value, bool):
            errors.append({
                "field": path,
                "message": "Expected type int.",
            })
            continue

        if not isinstance(value, expected_type):
            errors.append({
                "field": path,
                "message": f"Expected type {expected_type.__name__}.",
            })

    for path, max_length in PROJECT_FIELD_MAX_LENGTHS.items():
        value = get_nested(data, path)

        if value is None:
            continue

        if not isinstance(value, str):
            errors.append({
                "field": path,
                "message": "Expected type str.",
            })
            continue

        if len(value) > max_length:
            errors.append({
                "field": path,
                "message": f"Expected max length {max_length}.",
            })

    country = get_nested(data, "location.address.country")
    if isinstance(country, str) and len(country) != 3:
        errors.append({
            "field": "location.address.country",
            "message": "Expected exactly 3 characters.",
        })

    start_date = get_nested(data, "startDate")
    if isinstance(start_date, str):
        try:
            datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            errors.append({
                "field": "startDate",
                "message": "Expected date format YYYY-MM-DD.",
            })

    nu_level = get_nested(data, "nuLevel")
    if isinstance(nu_level, int) and nu_level < 0:
        errors.append({
            "field": "nuLevel",
            "message": "Expected integer >= 0.",
        })

    return errors


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

    return Response({
        "access_token": str(refresh.access_token),
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def mock_project_import(request):
    try:
        auth_result = JWTAuthentication().authenticate(request)
    except (AuthenticationFailed, InvalidToken):
        auth_result = None

    if auth_result is None:
        return Response(status=status.HTTP_401_UNAUTHORIZED)

    validation_errors = validate_project_payload(request.data)

    if validation_errors:
        return Response(status=status.HTTP_400_BAD_REQUEST)

    postal_code = get_nested(request.data, "location.address.postalCode")

    if postal_code == "99999":
        return Response(status=status.HTTP_409_CONFLICT)

    project_number = request.data["projectNumber"]
    project_shared_id = make_project_shared_id(project_number)

    InGoImportedProject.objects.update_or_create(
        project_number=project_number,
        defaults={
            "project_name": request.data["projectName"],
            "project_shared_id": project_shared_id,
            "payload": request.data,
        },
    )

    return Response({
        "projectSharedId": project_shared_id,
    }, status=status.HTTP_200_OK)
