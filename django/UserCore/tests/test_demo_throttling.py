import itertools
import pytest
from django.core.cache import caches
from rest_framework.settings import api_settings



DEMO_START = "/api/user/auth/demo/start/"
DEMO_RESET = "/api/user/auth/demo/reset/"
ME = "/api/user/me/"
ROLES = "/api/user/roles/"
USERS = "/api/user/users/"

TEST_SIGNING_KEY = "test-secret-not-for-prod"

@pytest.mark.django_db
def test_demo_start_throttled(api_client, settings, monkeypatch):
    # 1) Real in-memory cache
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "throttle-tests",
        }
    }

    # 2) Patch DRF api_settings so get_rate() sees our scope
    monkeypatch.setattr(
        api_settings, "DEFAULT_THROTTLE_RATES",
        {"demo_start": "5/minute"}, raising=False
    )

    # 3) Rebind throttle cache and clear
    from UserCore.views import DemoStartThrottle
    DemoStartThrottle.cache = caches["default"]
    caches["default"].clear()

    # 4) Hit endpoint
    codes = [api_client.post(DEMO_START).status_code for _ in range(12)]
    assert 429 in codes, f"Expected throttling, got {codes}"
