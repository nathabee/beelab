import itertools

def test_demo_start_throttled(api_client, db, settings):
    # scope rate configured in settings: demo_start: 10/hour
    codes = []
    for _ in itertools.repeat(None, 12):
        r = api_client.post("/api/user/auth/demo/start/")
        codes.append(r.status_code)
    # at least one call should hit 429
    assert 429 in codes
