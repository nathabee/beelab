from django.contrib.auth import get_user_model

from InGoCore.services.ingo_client import InGoClientError


IMPORT_PROJECT_URL = "/api/ingo/projects/import/"
MOCK_TOKEN_URL = "/api/GetToken/ingo"
MOCK_PROJECT_IMPORT_URL = "/api/projectimport"


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
        {"projectName": "ImportProject", "projectNumber": "1000"},
        format="json",
    )

    assert res.status_code == 200
    assert res.data == {
        "projectSharedId": "mock-project-shared-id",
        "status": "imported",
        "received": {"projectName": "ImportProject", "projectNumber": "1000"},
    }
