from django.contrib.auth import get_user_model

from InGoCore.models import InGoImportedProject
from InGoCore.services.ingo_client import InGoClientError


IMPORT_PROJECT_URL = "/api/ingo/projects/import/"
MOCK_TOKEN_URL = "/api/GetToken/ingo"
MOCK_PROJECT_IMPORT_URL = "/api/projectimport"


def pdf_project_payload(project_number="1000", postal_code="123456"):
    return {
        "projectName": "ImportProject",
        "projectNumber": project_number,
        "location": {
            "address": {
                "streetName": "Musterstrasse",
                "streetNumber": "1",
                "city": "Musterstadt",
                "state": "Musterbundesland",
                "postalCode": postal_code,
                "country": "deu",
            },
            "coordinates": "8.0, 54.0",
        },
        "localContact": {
            "localContactName": "Karl Kontakt",
            "localContactPhone": "+49 30 123456",
        },
        "firstResponder": {
            "firstResponderName": "Emil Erster",
            "firstResponderNumber": "+49 30 321321",
        },
        "fireDepartment": {
            "fireDepartmentName": "Fabian Feuer",
            "fireDepartmentNumber": "+49 30 987987",
        },
        "startDate": "2024-03-25",
        "nuLevel": 2,
    }


class FakeInGoClient:
    posted_payload = None

    def post_project(self, project_payload):
        FakeInGoClient.posted_payload = project_payload
        return {"projectSharedId": "shared-123"}


class FakeInGoError(InGoClientError):
    code = "INGO_TEST_ERROR"
    status_code = 502


class FailingInGoClient:
    def post_project(self, project_payload):
        raise FakeInGoError("InGo failed")


def test_import_project_maps_company_base_payload(api_client, db, monkeypatch):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-test")
    api_client.force_authenticate(user=user)
    monkeypatch.setattr("InGoCore.views.InGoClient", FakeInGoClient)

    res = api_client.post(IMPORT_PROJECT_URL, {
        "companyBase": {
            "ProjektNummer": "1000",
            "Projektbezeichnung": "ImportProject",
        }
    }, format="json")

    assert res.status_code == 200
    assert res.data == {"projectSharedId": "shared-123"}
    assert FakeInGoClient.posted_payload == {
        "projectNumber": "1000",
        "projectName": "ImportProject",
    }


def test_import_project_returns_meaningful_error(api_client, db, monkeypatch):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-test")
    api_client.force_authenticate(user=user)
    monkeypatch.setattr("InGoCore.views.InGoClient", FailingInGoClient)

    res = api_client.post(IMPORT_PROJECT_URL, {
        "projectName": "ImportProject",
    }, format="json")

    assert res.status_code == 502
    assert res.data == {
        "error": {
            "code": "INGO_TEST_ERROR",
            "message": "InGo failed",
        }
    }


def test_mock_ingo_token_endpoint_matches_external_shape(api_client, db, settings):
    User = get_user_model()
    User.objects.create_user(username="ingo-client", password="ingo-secret")
    settings.INGO_TENANT_NAME = "ingo"

    res = api_client.post(MOCK_TOKEN_URL, {
        "client_id": "ingo-client",
        "client_secret": "ingo-secret",
    }, format="json")

    assert res.status_code == 200
    assert set(res.data.keys()) == {"access_token"}
    assert res.data["access_token"]


def test_mock_ingo_token_endpoint_rejects_invalid_credentials(api_client, db, settings):
    User = get_user_model()
    User.objects.create_user(username="ingo-client", password="ingo-secret")
    settings.INGO_TENANT_NAME = "ingo"

    res = api_client.post(MOCK_TOKEN_URL, {
        "client_id": "ingo-client",
        "client_secret": "wrong",
    }, format="json")

    assert res.status_code == 401
    assert res.data["error"]["code"] == "INGO_MOCK_INVALID_CLIENT"


def test_mock_ingo_token_endpoint_requires_config(api_client, settings):
    settings.INGO_TENANT_NAME = ""

    res = api_client.post(MOCK_TOKEN_URL, {
        "client_id": "",
        "client_secret": "",
    }, format="json")

    assert res.status_code == 500
    assert res.data["error"]["code"] == "INGO_MOCK_CONFIGURATION_ERROR"


def test_mock_ingo_project_import_endpoint_matches_external_shape(api_client, db, settings):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-client", password="ingo-secret")
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    res = api_client.post(
        MOCK_PROJECT_IMPORT_URL,
        pdf_project_payload(),
        format="json",
    )

    assert res.status_code == 200
    assert set(res.data.keys()) == {"projectSharedId"}
    assert res.data["projectSharedId"]

    imported = InGoImportedProject.objects.get(project_number="1000")
    assert imported.project_name == "ImportProject"
    assert imported.project_shared_id == res.data["projectSharedId"]
    assert imported.payload["location"]["address"]["postalCode"] == "123456"


def test_mock_ingo_project_import_project_shared_id_is_deterministic(api_client, db):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-client", password="ingo-secret")
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    first = api_client.post(MOCK_PROJECT_IMPORT_URL, pdf_project_payload("1000"), format="json")
    second = api_client.post(MOCK_PROJECT_IMPORT_URL, pdf_project_payload("1000"), format="json")
    other = api_client.post(MOCK_PROJECT_IMPORT_URL, pdf_project_payload("2000"), format="json")

    assert first.status_code == 200
    assert second.status_code == 200
    assert other.status_code == 200
    assert first.data == second.data
    assert first.data["projectSharedId"] != other.data["projectSharedId"]

    assert InGoImportedProject.objects.count() == 2
    assert InGoImportedProject.objects.get(project_number="1000").project_shared_id == first.data["projectSharedId"]
    assert InGoImportedProject.objects.get(project_number="2000").project_shared_id == other.data["projectSharedId"]


def test_mock_ingo_project_import_updates_existing_project_payload(api_client, db):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-client", password="ingo-secret")
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    first_payload = pdf_project_payload("1000")
    second_payload = pdf_project_payload("1000")
    second_payload["projectName"] = "UpdatedProject"
    second_payload["location"]["address"]["city"] = "Updatedstadt"

    first = api_client.post(MOCK_PROJECT_IMPORT_URL, first_payload, format="json")
    second = api_client.post(MOCK_PROJECT_IMPORT_URL, second_payload, format="json")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.data == second.data
    assert InGoImportedProject.objects.count() == 1

    imported = InGoImportedProject.objects.get(project_number="1000")
    assert imported.project_name == "UpdatedProject"
    assert imported.payload["location"]["address"]["city"] == "Updatedstadt"


def test_mock_ingo_project_import_rejects_duplicate_postal_code(api_client, db):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-client", password="ingo-secret")
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    res = api_client.post(
        MOCK_PROJECT_IMPORT_URL,
        pdf_project_payload(postal_code="99999"),
        format="json",
    )

    assert res.status_code == 409
    assert "projectSharedId" not in res.data
    assert res.data["error"]["code"] == "INGO_PROJECT_ALREADY_EXISTS"
    assert InGoImportedProject.objects.count() == 0


def test_mock_ingo_project_import_validates_required_fields(api_client, db):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-client", password="ingo-secret")
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    payload = pdf_project_payload()
    del payload["location"]["address"]["streetName"]

    res = api_client.post(MOCK_PROJECT_IMPORT_URL, payload, format="json")

    assert res.status_code == 400
    assert res.data["error"]["code"] == "INGO_VALIDATION_ERROR"
    assert {"field": "location.address.streetName", "message": "Field is required."} in res.data["error"]["details"]


def test_mock_ingo_project_import_validates_pdf_constraints(api_client, db):
    User = get_user_model()
    user = User.objects.create_user(username="ingo-client", password="ingo-secret")
    from rest_framework_simplejwt.tokens import RefreshToken

    token = str(RefreshToken.for_user(user).access_token)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    payload = pdf_project_payload()
    payload["projectName"] = "x" * 151
    payload["location"]["address"]["country"] = "de"
    payload["startDate"] = "25.03.2024"
    payload["nuLevel"] = -1

    res = api_client.post(MOCK_PROJECT_IMPORT_URL, payload, format="json")

    assert res.status_code == 400
    fields = {error["field"] for error in res.data["error"]["details"]}
    assert "projectName" in fields
    assert "location.address.country" in fields
    assert "startDate" in fields
    assert "nuLevel" in fields
