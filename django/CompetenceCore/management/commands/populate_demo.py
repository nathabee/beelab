# django/UserCore/management/commands/populate_demo.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import secrets

from django.conf import settings
from CompetenceCore.models import Catalogue, Eleve, Niveau
from UserCore.models import DemoAccount  # 1-to-1 with user

DEMO_TEACHERS = {"jacques", "jakob", "jakez", "james"}  # demo accounts

USERS_DATA = [
    {'username': 'jacques',   'first_name': 'Jacques',  'last_name': 'Dupain',    'lang': 'fr', 'is_staff': False, 'roles': ['teacher','demo'],              'catalogues': [34, 35, 36]},
    {'username': 'jakob',     'first_name': 'Jakob',    'last_name': 'Brotmann',  'lang': 'de', 'is_staff': False, 'roles': ['teacher','demo'],              'catalogues':[34, 35, 36]},
    {'username': 'jakez',     'first_name': 'Jakez',    'last_name': 'Bara',      'lang': 'bz', 'is_staff': False, 'roles': ['teacher','demo'],              'catalogues': [34, 35, 36]},
    {'username': 'james',     'first_name': 'James',    'last_name': 'Breadman',  'lang': 'en', 'is_staff': False, 'roles': ['teacher','demo'],              'catalogues':[34, 35, 36]},

    # keep these two as NON-demo
    {'username': 'nathaprof', 'first_name': 'Nathalie', 'last_name': 'Legrand',   'lang': 'fr', 'is_staff': False, 'roles': ['teacher'],                      'catalogues': [31, 32, 33]},
    {'username': 'nathachef', 'first_name': 'Nathalie', 'last_name': 'Bordas',    'lang': 'fr', 'is_staff': True,  'roles': ['admin','statistics','analytics'],'catalogues': [31, 32, 33]},
]

class Command(BaseCommand):
    help = "Creates demo & regular users, assigns groups, links catalogues, and seeds a demo élève."

    def handle(self, *args, **kwargs):
        User = get_user_model()
        default_password = getattr(settings, "DEFAULT_USER_PASSWORD", "changeme")

        # Ensure groups exist (note: 'demo' added)
        for name in {"teacher", "admin", "analytics", "statistics", "demo"}:
            Group.objects.get_or_create(name=name)

        for data in USERS_DATA:
            user, created = User.objects.get_or_create(
                username=data['username'],
                defaults={
                    'first_name': data['first_name'],
                    'last_name':  data['last_name'],
                    'lang':       data['lang'],
                    'is_staff':   data['is_staff'],
                    'is_active':  True,
                }
            )
            if created:
                user.set_password(default_password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user: {user.username}"))
            else:
                self.stdout.write(self.style.WARNING(f"User exists: {user.username}"))

            # Assign groups (include analytics explicitly if 'statistics' present)
            for role in data['roles']:
                grp, _ = Group.objects.get_or_create(name=role)
                user.groups.add(grp)
                if role == "statistics":
                    analytics = Group.objects.get(name="analytics")
                    user.groups.add(analytics)
            user.save()

            # Link catalogues
            for cat_id in data['catalogues']:
                try:
                    cat = Catalogue.objects.get(id=cat_id)
                    user.catalogues.add(cat)
                except Catalogue.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f"Catalogue id={cat_id} not found; skipped."))

            # Issue/refresh DemoAccount for demo teachers only
            if user.username in DEMO_TEACHERS:
                da, _ = DemoAccount.objects.get_or_create(
                    user=user,
                    defaults={
                        "sid": secrets.token_hex(16),
                        "expires_at": timezone.now() + timedelta(days=30),
                        "active": True,
                    },
                )
                if not da.active or da.expires_at <= timezone.now():
                    da.sid = secrets.token_hex(16)
                    da.expires_at = timezone.now() + timedelta(days=30)
                    da.active = True
                    da.save(update_fields=["sid", "expires_at", "active"])

        # Seed the demo élève and attach all active demo teachers
        try:
            niveau = Niveau.objects.get(id=3)  # CP in your CSV; tweak if needed
        except Niveau.DoesNotExist:
            niveau = Niveau.objects.first()

        eleve, _ = Eleve.objects.update_or_create(
            nom="Einstein",
            prenom="Franky",
            defaults={"niveau": niveau, "is_demo": True, "datenaissance": None}
        )

        demo_teachers_qs = User.objects.filter(
            username__in=DEMO_TEACHERS,
            demo_account__active=True,
            demo_account__expires_at__gt=timezone.now(),
        )
        if demo_teachers_qs.exists():
            eleve.professeurs.add(*demo_teachers_qs)

        self.stdout.write(self.style.SUCCESS("✔ populate_demo completed"))
