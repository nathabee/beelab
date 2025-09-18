# django/conftest.py
import pytest
from datetime import timedelta
#from django.core.cache import cache
from django.core.cache import caches
from django.contrib.auth.models import Group
from rest_framework.test import APIClient  
from rest_framework.settings import api_settings

  

@pytest.fixture(autouse=True)
def jwt_test_settings(settings):
    # JWT test key/alg
    settings.SIMPLE_JWT.update({
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
        "SIGNING_KEY": "test-secret-not-for-prod",
        "ALGORITHM": "HS256",
    })
    return settings

# NEW: Ensure throttling is active in tests
@pytest.fixture(autouse=True)
def rest_framework_throttle_settings(settings):
    rf = getattr(settings, "REST_FRAMEWORK", {}).copy()
    rf.update({
        "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
        "DEFAULT_THROTTLE_RATES": {"demo_start": "10/hour"},
    })
    settings.REST_FRAMEWORK = rf

    # Ensure cache exists so throttle counters persist
    if not hasattr(settings, "CACHES"):
        settings.CACHES = {
            "default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}
        }
    return settings

@pytest.fixture
def api_client():
    return APIClient()
 

@pytest.fixture
def demo_group(db):  # <-- depend on db here (no mark needed)
    return Group.objects.get_or_create(name="demo")[0]

#@pytest.fixture(autouse=True)
#def throttle_test_settings(settings):
#    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["demo_start"] = "5/minute"
#    from django.core.cache import cache
#    cache.clear()
#    yield
#    cache.clear()

@pytest.fixture
def throttle_cache(settings):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "throttle-tests",
        }
    }
    settings.REST_FRAMEWORK.setdefault("DEFAULT_THROTTLE_RATES", {})
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["demo_start"] = "5/minute"
    return settings



@pytest.fixture
def throttle_locmem(settings, monkeypatch):
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "throttle-tests",
        }
    }
    # Patch DRF api_settings so throttle is ON
    monkeypatch.setattr(
        api_settings, "DEFAULT_THROTTLE_RATES",
        {"demo_start": "5/minute"}, raising=False
    )
    # Rebind cache on the throttle class
    from UserCore.views import DemoStartThrottle
    DemoStartThrottle.cache = caches["default"]
    caches["default"].clear()
    return DemoStartThrottle