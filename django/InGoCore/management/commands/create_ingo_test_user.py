from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update the default InGo mock client user."

    def add_arguments(self, parser):
        parser.add_argument("--username", default=None)
        parser.add_argument("--password", default=None)
        parser.add_argument("--email", default="ingo-client@example.test")

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"] or settings.INGO_CLIENT_ID
        password = options["password"] or settings.INGO_CLIENT_SECRET
        email = options["email"]

        if not username or not password:
            raise SystemExit("INGO_CLIENT_ID and INGO_CLIENT_SECRET must be configured.")

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": "InGo",
                "last_name": "Client",
                "lang": "de",
            },
        )
        user.email = email
        user.first_name = user.first_name or "InGo"
        user.last_name = user.last_name or "Client"
        if hasattr(user, "lang"):
            user.lang = user.lang or "de"
        user.set_password(password)
        user.is_active = True
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"InGo mock client user {action}: {username}"))
