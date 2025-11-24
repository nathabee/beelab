from django.core.management import call_command
from django.utils import timezone
from datetime import timedelta
from UserCore.models import DemoAccount
from django.contrib.auth import get_user_model

def test_cleanup_removes_expired(db):
    User = get_user_model()
    u = User.objects.create_user(username="demo_x", password="x")
    acct = DemoAccount.objects.create(
        user=u, sid="sid", expires_at=timezone.now() - timedelta(days=1), active=False
    )
    call_command("cleanup_demo")
    assert not User.objects.filter(username="demo_x").exists()
    assert not DemoAccount.objects.filter(sid="sid").exists()
