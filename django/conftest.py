# conftest.py
import pytest
from django.contrib.auth.models import Group
from rest_framework.test import APIClient
from datetime import timedelta

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

@pytest.fixture
def demo_group(db):  # <-- depend on db here (no mark needed)
    return Group.objects.get_or_create(name="demo")[0]
