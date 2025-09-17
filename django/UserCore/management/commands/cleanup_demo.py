from django.core.management.base import BaseCommand
from django.utils import timezone
from UserCore.models import DemoAccount

class Command(BaseCommand):
    help = "Delete expired or inactive demo accounts"

    def handle(self, *args, **options):
        qs = DemoAccount.objects.select_related("user").all()
        count = 0
        now = timezone.now()
        for acct in qs:
            if not acct.active or acct.expires_at <= now:
                acct.user.delete()  # cascades to DemoAccount
                count += 1
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} demo users"))
