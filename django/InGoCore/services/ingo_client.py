import requests
from django.conf import settings


class InGoClientError(Exception):
    code = "INGO_CLIENT_ERROR"
    status_code = 502


class InGoConfigurationError(InGoClientError):
    code = "INGO_CONFIGURATION_ERROR"
    status_code = 500


class InGoHTTPError(InGoClientError):
    code = "INGO_HTTP_ERROR"


class InGoTimeoutError(InGoClientError):
    code = "INGO_TIMEOUT"
    status_code = 504


class InGoInvalidResponseError(InGoClientError):
    code = "INGO_INVALID_RESPONSE"


COMPANY_BASE_TO_INGO = {
    "ProjektNummer": ("projectNumber",),
    "Projektbezeichnung": ("projectName",),
    "ProjektStrasse": ("location", "address", "streetName"),
    "ProjektHausnummer": ("location", "address", "streetNumber"),
    "ProjektOrt": ("location", "address", "city"),
    "ProjektBundesland": ("location", "address", "state"),
    "ProjektPLZ": ("location", "address", "postalCode"),
    "ProjektLand": ("location", "address", "country"),
    "AnsprechpartnerName": ("localContact", "localContactName"),
    "AnsprechpartnerTelefon": ("localContact", "localContactPhone"),
    "ProjektStartDatum": ("startDate",),
    "NachunternehmerStufe": ("nuLevel",),
}


def _set_nested(target, path, value):
    cursor = target
    for key in path[:-1]:
        cursor = cursor.setdefault(key, {})
    cursor[path[-1]] = value


def map_company_base_to_project_payload(company_base):
    payload = {}
    for source_key, target_path in COMPANY_BASE_TO_INGO.items():
        if source_key not in company_base:
            continue
        value = company_base[source_key]
        if value is None:
            continue
        _set_nested(payload, target_path, value)
    return payload


class InGoClient:
    def __init__(self, timeout=30):
        self.base_url = self._required_setting("INGO_BASE_URL").rstrip("/")
        self.tenant_name = self._required_setting("INGO_TENANT_NAME")
        self.client_id = self._required_setting("INGO_CLIENT_ID")
        self.client_secret = self._required_setting("INGO_CLIENT_SECRET")
        self.timeout = timeout

    @staticmethod
    def _required_setting(name):
        value = getattr(settings, name, "")
        if not value:
            raise InGoConfigurationError(f"Missing Django setting: {name}")
        return value

    def get_access_token(self):
        response = self._post(
            f"{self.base_url}/api/GetToken/{self.tenant_name}",
            json={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        data = self._json(response, "token")
        token = data.get("access_token")
        if not token:
            raise InGoInvalidResponseError("InGo token response did not include access_token")
        return token

    def post_project(self, project_payload):
        token = self.get_access_token()
        response = self._post(
            f"{self.base_url}/api/projectimport",
            json=project_payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        return self._json(response, "project import")

    def _post(self, url, **kwargs):
        kwargs.setdefault("timeout", self.timeout)
        try:
            response = requests.post(url, **kwargs)
            response.raise_for_status()
            return response
        except requests.Timeout as exc:
            raise InGoTimeoutError(f"InGo request timed out: {url}") from exc
        except requests.HTTPError as exc:
            response = exc.response
            status_code = getattr(response, "status_code", "unknown")
            body = getattr(response, "text", "")
            error = InGoHTTPError(f"InGo HTTP error {status_code} for {url}: {body}")
            if isinstance(status_code, int):
                error.status_code = status_code if status_code in {400, 401, 403, 404, 500} else 502
            raise error from exc
        except requests.RequestException as exc:
            raise InGoClientError(f"InGo request failed for {url}: {exc}") from exc

    @staticmethod
    def _json(response, context):
        try:
            return response.json()
        except ValueError as exc:
            raise InGoInvalidResponseError(f"InGo {context} response was not valid JSON") from exc
