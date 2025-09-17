# django/conftest.py
import pytest
from datetime import timedelta
from django.core.cache import cache
from django.contrib.auth.models import Group
from rest_framework.test import APIClient

@pytest.fixture(autouse=True)
def jwt_test_settings(settings):
    settings.SIMPLE_JWT.update({
        "ACCESS_TOKEN_LIFETIME": timedelta(minutes=5),
        "SIGNING_KEY": "test-secret-not-for-prod",
        "ALGORITHM": "HS256",
    })
    return settings
 

@pytest.fixture
def api_client():
    return APIClient()

#@pytest.fixture
#@pytest.mark.django_db
#def demo_group():
#    return Group.objects.get_or_create(name="demo")[0]


@pytest.fixture
def demo_group(db):  # <-- depend on db here (no mark needed)
    return Group.objects.get_or_create(name="demo")[0]

@pytest.fixture(autouse=True)
def throttle_test_settings(settings):
    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["demo_start"] = "5/minute"
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()
 
 
 