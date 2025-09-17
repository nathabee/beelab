import jwt
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from datetime import timedelta
from django.contrib.auth import get_user_model
from UserCore.models import DemoAccount

DEMO_START = "/api/user/auth/demo/start/"
DEMO_RESET  = "/api/user/auth/demo/reset/"
ME = "/api/user/me/"

def _decode(token: str):
    return jwt.decode(token, "test-secret-not-for-prod", algorithms=["HS256"])

def test_demo_start_sets_cookie_and_returns_access(api_client, demo_group, db):
    res = api_client.post(DEMO_START)
    assert res.status_code == 200
    assert "access" in res.data
    # HttpOnly cookie set
    cookie = res.cookies.get("demo_sid")
    assert cookie is not None
    assert cookie["httponly"]
    # token has role and demo_exp
    payload = _decode(res.data["access"])
    assert payload.get("role") == "demo"
    assert isinstance(payload.get("demo_exp"), int)

def test_demo_reuse_same_cookie_reuses_account(api_client, db):
    r1 = api_client.post(DEMO_START)
    sid = r1.cookies.get("demo_sid").value
    t1 = _decode(r1.data["access"])
    # call again with same cookie
    api_client.cookies["demo_sid"] = sid
    r2 = api_client.post(DEMO_START)
    t2 = _decode(r2.data["access"])
    # same user id in token sub claim
    assert t1["user_id"] == t2["user_id"]

@freeze_time("2024-01-01 10:00:00")
def test_demo_expiry_blocks_after_30_days(api_client, db):
    r = api_client.post(DEMO_START)
    access = r.data["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    # me works now
    ok = api_client.get(ME)
    assert ok.status_code == 200
    # jump beyond 30 days -> expect 401/403
    with freeze_time("2024-02-05 10:00:01"):
        expired = api_client.get(ME)
        assert expired.status_code in (401, 403)

def test_demo_reset_rotates_account(api_client, db):
    r1 = api_client.post(DEMO_START)
    u1 = _decode(r1.data["access"])["user_id"]
    # reset
    api_client.cookies["demo_sid"] = r1.cookies.get("demo_sid").value
    r2 = api_client.post(DEMO_RESET)
    u2 = _decode(r2.data["access"])["user_id"]
    assert u1 != u2
