from django.urls import reverse
import jwt

USERS = "/api/user/users/"

def _decode(token: str):
    return jwt.decode(token, "test-secret-not-for-prod", algorithms=["HS256"])

def _demo_login(client):
    r = client.post("/api/user/auth/demo/start/")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    return r

def test_demo_cannot_create_users(api_client, db):
    _demo_login(api_client)
    # list should be forbidden by your IsAdminUser on list; use 'me' for read
    me = api_client.get("/api/user/me/")
    assert me.status_code == 200
    create = api_client.post(USERS, {"username": "x", "password": "x", "roles": []}, format="json")
    assert create.status_code in (401, 403)

def test_demo_can_read_allowed_views(api_client, db):
    _demo_login(api_client)
    me = api_client.get("/api/user/me/")
    assert me.status_code == 200
