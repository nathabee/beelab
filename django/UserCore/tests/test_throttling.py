import itertools

def test_demo_start_throttled(api_client, db, settings):
    codes = []
    for _ in itertools.repeat(None, 12):
        r = api_client.post("/api/user/auth/demo/start/")
        codes.append(r.status_code)
    assert 429 in codes