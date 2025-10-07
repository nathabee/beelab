# CompetenceCore/demo_linking.py

from django.contrib.auth import get_user_model
from django.db import transaction

from CompetenceCore.models import Catalogue, Eleve

User = get_user_model()

@transaction.atomic
def attach_demo_teacher_relations(user: User, *, language: str | None = None) -> None:
    """
    Idempotently wire a *teacher* to demo data:
      - Demo catalogues (optionally constrained by language if `Catalogue.language` exists)
      - All demo eleves
    Views remain normal (no demo branches).
    """
    # We always call this from the demo flow; only check TEACHER.
    if not user.groups.filter(name="teacher").exists():
        return

    # --- Demo catalogues
    qs = Catalogue.objects.filter(is_demo=True)

    # Detect presence of a language field on Catalogue
    has_lang_field = any(f.name == "language" for f in Catalogue._meta.get_fields())

    if has_lang_field and language:
        # 1) Remove demo catalogues from *other* languages for this user
        to_remove = user.catalogues.filter(is_demo=True).exclude(language=language)
        if to_remove.exists():
            user.catalogues.remove(*to_remove)

        # 2) Ensure demo catalogues for the requested language are attached
        to_add = qs.filter(language=language)
        if to_add.exists():
            user.catalogues.add(*to_add)
    else:
        # No language field → just ensure *all* demo catalogues are attached
        if qs.exists():
            user.catalogues.add(*qs)

    # --- Demo eleves (idempotent; .add() won’t duplicate)
    demo_eleves = Eleve.objects.filter(is_demo=True)
    for e in demo_eleves:
        e.professeurs.add(user)
