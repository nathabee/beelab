from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models 
from django.utils import timezone

# Table: customize User   

class CustomUser(AbstractUser):
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('fr', 'Francais'),
        ('br', 'Breton'),
        ('de', 'Deutsch'),
        # Add other languages as needed
    ]
    lang = models.CharField(
        max_length=2,
        choices=LANGUAGE_CHOICES,
        default='en',  # Default to English
    )

 
class DemoAccount(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="demo_account",
    )
    sid = models.CharField(max_length=64, unique=True, db_index=True)  # opaque cookie id
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(db_index=True)
    active = models.BooleanField(default=True)

    @property
    def expired(self) -> bool:
        return not self.active or timezone.now() >= self.expires_at
