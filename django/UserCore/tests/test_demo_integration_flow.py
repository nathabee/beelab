import jwt
import itertools
import pytest
from datetime import timedelta

DEMO_START = "/api/user/auth/demo/start/"
DEMO_RESET = "/api/user/auth/demo/reset/"
ME = "/api/user/me/"
ROLES = "/api/user/roles/"
USERS = "/api/user/users/"

TEST_SIGNING_KEY = "test-secret-not-for-prod"

def _decode(token: str):
    # The jwt secret+alg are fixed in conftest via SIMPLE_JWT override
    return jwt.decode(token, TEST_SIGNING_KEY, algorithms=["HS256"])

@pytest.mark.django_db
def test_demo_user_happy_path(api_client):
    # 1) Start demo
    r_start = api_client.post(DEMO_START)
    assert r_start.status_code == 200
    assert "access" in r_start.data
    assert r_start.cookies.get("demo_sid") is not None

    access1 = r_start.data["access"]
    payload1 = _decode(access1)
    assert payload1.get("role") == "demo"
    assert isinstance(payload1.get("demo_exp"), int)

    # 2) Use token like a normal user: /me
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access1}")
    r_me = api_client.get(ME)
    assert r_me.status_code == 200
    assert r_me.json()["is_demo"] is True
    assert r_me.json()["demo_expires_at"] is not None

    # 3) Check roles
    r_roles = api_client.get(ROLES)
    assert r_roles.status_code == 200
    assert "demo" in r_roles.json().get("roles", [])

    # 4) Demo cannot create users (permissions)
    r_create = api_client.post(USERS, {"username": "x", "password": "x", "roles": []}, format="json")
    assert r_create.status_code in (401, 403)

    # 5) Reset demo (rotate account)
    #    Important: send the same demo_sid cookie back
    demo_cookie = r_start.cookies.get("demo_sid").value
    api_client.cookies["demo_sid"] = demo_cookie

    r_reset = api_client.post(DEMO_RESET)
    assert r_reset.status_code == 200
    access2 = r_reset.data["access"]
    payload2 = _decode(access2)
    assert payload1["user_id"] != payload2["user_id"], "reset should rotate to a new account"

#@pytest.mark.django_db 
#def test_demo_start_throttled(api_client, settings, throttle_locmem):
#    settings.REST_FRAMEWORK = settings.REST_FRAMEWORK or {}
#    settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {"demo_start": "5/minute"}
#    codes = [api_client.post(DEMO_START).status_code for _ in range(12)]
#    assert 429 in codes, f"Expected throttling after ~10 calls, got codes={codes}"

 
@pytest.mark.django_db
def test_demo_start_throttled(api_client, throttle_locmem):
    codes = [api_client.post(DEMO_START).status_code for _ in range(12)]
    assert 429 in codes, f"Expected throttling after ~10 calls, got codes={codes}"




@pytest.mark.django_db
def test_demo_reuse_same_cookie_reuses_account(api_client):
    r1 = api_client.post(DEMO_START)
    sid = r1.cookies.get("demo_sid").value
    t1 = _decode(r1.data["access"])

    # Repeat with same cookie
    api_client.cookies["demo_sid"] = sid
    r2 = api_client.post(DEMO_START)
    assert r2.status_code == 200
    t2 = _decode(r2.data["access"])
    assert t1["user_id"] == t2["user_id"], "same cookie should reuse same active demo account"
