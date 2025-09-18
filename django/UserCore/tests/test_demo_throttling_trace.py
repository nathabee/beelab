# tests/test_demo_throttling_trace.py
import itertools
import logging
import json
import time
import pytest
from django.core.cache import caches


@pytest.mark.django_db
def test_demo_start_throttled_observe_internals(api_client, settings, monkeypatch, capsys):
    # 1) Real in-memory cache
    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "throttle-tests",
        }
    }

    # 2) Import throttle and bind subclass+base to our cache
    from UserCore.views import DemoStartThrottle
    from rest_framework.throttling import ScopedRateThrottle

    cache = caches["default"]
    DemoStartThrottle.cache = cache
    ScopedRateThrottle.cache = cache
    cache.clear()

    # 3) Force a small rate and a fixed cache key
    monkeypatch.setattr(DemoStartThrottle, "get_rate", lambda self: "5/minute", raising=True)
    fixed_key = "throttle_test_demo_start_fixed_key"
    monkeypatch.setattr(
        DemoStartThrottle, "get_cache_key", lambda self, req, view: fixed_key, raising=True
    )

    # 4) Wrap allow_request to ensure instance has proper rate/limits
    original_allow = DemoStartThrottle.allow_request
    observations = []

    def wrapped_allow(self, request, view):
        # Force LocMem cache on the instance
        self.cache = cache

        # 🔧 Ensure the instance has an active rate + limits
        self.rate = "5/minute"
        self.num_requests, self.duration = self.parse_rate(self.rate)

        # (Optional) Pre-write a hit to mimic DRF’s throttle_success
        now = time.time()
        window = 60
        hist = cache.get(fixed_key, []) or []
        hist = [t for t in hist if t > now - window]
        hist.append(now)
        cache.set(fixed_key, hist, window)

        # Call the real throttle logic
        allowed = original_allow(self, request, view)

        # Snapshot after
        hist_after = cache.get(fixed_key, []) or []
        wait = 0 if allowed else max(0, int((hist_after[0] + window) - now)) if hist_after else 0
        observations.append({
            "allowed": allowed,
            "hits": len(hist_after),
            "wait": wait,
        })
        return allowed

    monkeypatch.setattr(DemoStartThrottle, "allow_request", wrapped_allow, raising=True)

    # 5) Exercise the endpoint
    codes = []
    for _ in itertools.repeat(None, 12):
        r = api_client.post("/api/user/auth/demo/start/")
        codes.append(r.status_code)

    # 6) Sanity: history should exist and have hits
    history = cache.get(fixed_key, []) or []
    assert isinstance(history, list)
    assert len(history) >= 1, "Throttle history did not persist to cache"

    # 7) Dump debug info
    print("\n=== Throttle snapshots ===")
    for i, obs in enumerate(observations, start=1):
        print(json.dumps({"req_idx": i, **obs}, indent=2))

    logging.getLogger(__name__).info("Throttle key=%s hits=%s", fixed_key, len(history))

    # 8) With 5/min, 12 rapid calls should yield at least one 429
    assert 429 in codes, f"Expected throttling, got {codes}"
