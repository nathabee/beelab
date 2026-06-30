import pytest
import requests

from InGoCore.services.ingo_client import (
    InGoClient,
    InGoConfigurationError,
    InGoHTTPError,
    InGoInvalidResponseError,
    InGoTimeoutError,
    map_company_base_to_project_payload,
)


class DummyResponse:
    def __init__(self, data=None, status_code=200, text="", json_error=False):
        self.data = data
        self.status_code = status_code
        self.text = text
        self.json_error = json_error

    def raise_for_status(self):
        if self.status_code >= 400:
            error = requests.HTTPError("boom")
            error.response = self
            raise error

    def json(self):
        if self.json_error:
            raise ValueError("invalid json")
        return self.data


@pytest.fixture
def ingo_settings(settings):
    settings.INGO_BASE_URL = "https://ingo.example.test/"
    settings.INGO_TENANT_NAME = "tenant"
    settings.INGO_CLIENT_ID = "client-id"
    settings.INGO_CLIENT_SECRET = "client-secret"
    return settings


def test_get_access_token_posts_credentials(monkeypatch, ingo_settings):
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        return DummyResponse({"access_token": "jwt-token"})

    monkeypatch.setattr("InGoCore.services.ingo_client.requests.post", fake_post)

    token = InGoClient().get_access_token()

    assert token == "jwt-token"
    assert calls == [(
        "https://ingo.example.test/api/GetToken/tenant",
        {
            "json": {"client_id": "client-id", "client_secret": "client-secret"},
            "timeout": 30,
        },
    )]


def test_post_project_gets_token_and_posts_payload(monkeypatch, ingo_settings):
    calls = []

    def fake_post(url, **kwargs):
        calls.append((url, kwargs))
        if url.endswith("/api/GetToken/tenant"):
            return DummyResponse({"access_token": "jwt-token"})
        return DummyResponse({"projectSharedId": "shared-123"})

    monkeypatch.setattr("InGoCore.services.ingo_client.requests.post", fake_post)

    payload = {"projectName": "ImportProject", "projectNumber": "1000"}
    response = InGoClient().post_project(payload)

    assert response == {"projectSharedId": "shared-123"}
    assert calls[1] == (
        "https://ingo.example.test/api/projectimport",
        {
            "json": payload,
            "headers": {
                "Authorization": "Bearer jwt-token",
                "Content-Type": "application/json",
            },
            "timeout": 30,
        },
    )


def test_missing_configuration_raises(settings):
    settings.INGO_BASE_URL = ""

    with pytest.raises(InGoConfigurationError, match="INGO_BASE_URL"):
        InGoClient()


def test_http_error_raises_meaningful_exception(monkeypatch, ingo_settings):
    monkeypatch.setattr(
        "InGoCore.services.ingo_client.requests.post",
        lambda *args, **kwargs: DummyResponse(status_code=401, text="Unauthorized"),
    )

    with pytest.raises(InGoHTTPError, match="401"):
        InGoClient().get_access_token()


def test_timeout_raises_meaningful_exception(monkeypatch, ingo_settings):
    def fake_post(*args, **kwargs):
        raise requests.Timeout("too slow")

    monkeypatch.setattr("InGoCore.services.ingo_client.requests.post", fake_post)

    with pytest.raises(InGoTimeoutError):
        InGoClient().get_access_token()


def test_invalid_json_raises_meaningful_exception(monkeypatch, ingo_settings):
    monkeypatch.setattr(
        "InGoCore.services.ingo_client.requests.post",
        lambda *args, **kwargs: DummyResponse(json_error=True),
    )

    with pytest.raises(InGoInvalidResponseError, match="valid JSON"):
        InGoClient().get_access_token()


def test_missing_access_token_raises(monkeypatch, ingo_settings):
    monkeypatch.setattr(
        "InGoCore.services.ingo_client.requests.post",
        lambda *args, **kwargs: DummyResponse({"token": "wrong-field"}),
    )

    with pytest.raises(InGoInvalidResponseError, match="access_token"):
        InGoClient().get_access_token()


def test_company_base_maps_to_ingo_project_payload():
    payload = map_company_base_to_project_payload({
        "ProjektNummer": "1000",
        "Projektbezeichnung": "ImportProject",
        "ProjektStrasse": "Musterstrasse",
        "ProjektHausnummer": "1",
        "ProjektOrt": "Musterstadt",
        "ProjektBundesland": "Hessen",
        "ProjektPLZ": "64750",
        "ProjektLand": "deu",
        "AnsprechpartnerName": "Max Mustermann",
        "AnsprechpartnerTelefon": "+49 123456789",
        "ProjektStartDatum": "2026-07-01",
        "NachunternehmerStufe": 2,
    })

    assert payload == {
        "projectNumber": "1000",
        "projectName": "ImportProject",
        "location": {
            "address": {
                "streetName": "Musterstrasse",
                "streetNumber": "1",
                "city": "Musterstadt",
                "state": "Hessen",
                "postalCode": "64750",
                "country": "deu",
            }
        },
        "localContact": {
            "localContactName": "Max Mustermann",
            "localContactPhone": "+49 123456789",
        },
        "startDate": "2026-07-01",
        "nuLevel": 2,
    }
