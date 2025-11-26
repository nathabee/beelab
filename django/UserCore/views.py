# UserCore/views.py
# 
from django.http import JsonResponse
import datetime, secrets
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes,authentication_classes , action
 

from rest_framework.response import Response


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken

from rest_framework import permissions, viewsets 
from rest_framework.permissions import IsAuthenticated, AllowAny  

from rest_framework.views import APIView


from config.settings import DEBUG

from .models import CustomUser
from .models import DemoAccount

from django.contrib.auth.models import Group


from .serializers import  UserSerializer 
from django.contrib.auth import get_user_model  
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import api_view, permission_classes, throttle_classes 
      
from django.core.exceptions import ObjectDoesNotExist

# add at top with other imports
from django.db import transaction
import random, re
from django.utils.text import slugify 
from django.conf import settings
from django.apps import apps
from django.db.models import Count
from CompetenceCore.models import Catalogue  # <-- import catalogue model

# keep your existing constants
ALLOWED_DEMO_ROLES = {"demo", "teacher", "farmer"}  # no 'admin'
ALLOWED_LANGS = {"en", "fr", "de", "bz"}



ADJECTIVES = [
  'brave','calm','clever','bright','gentle','happy','kind','lucky','quick','quiet',
  'swift','witty','sunny','merry','noble','eager','bold','jolly','spry','sly',
  'curious','daring','fearless','glowing','luminous','mighty','peppy','plucky','proud','snappy',
  'sparkly','spirited','sturdy','valiant','whimsical','zesty','zealous','cheerful','crafty','dapper'
]
ANIMALS = [
  'otter','fox','lynx','wren','panda','owl','finch','hare','wolf','koala',
  'dolphin','tiger','bear','seal','sparrow','heron','ibis','yak','bison','marten',
  'eagle','falcon','raven','badger','beaver','hedgehog','lemur','gibbon','puffin','penguin',
  'orca','narwhal','panther','jaguar','cougar','moose','elk','otterhound','stallion','mustang'
]
 
 


def _unique_username(base: str, User) -> str:
    """
    Ensure username uniqueness by adding a short numeric suffix if needed.
    Max length for Django username is 150.
    """
    base = slugify(base)[:120]  # leave room for suffix
    candidate = base or "demo"
    i = 0
    while User.objects.filter(username=candidate).exists():
        i += 1
        candidate = f"{base}-{i}"
        if len(candidate) > 150:
            candidate = candidate[:150]
    return candidate

def _generate_codename():
    """Returns ('Sunny', 'Otter', 'demo-sunny-otter-42')"""
    a = random.choice(ADJECTIVES)
    b = random.choice(ANIMALS)
    # Title case for display, kebab for username
    first = a.title()
    last = b.title()
    uname_base = f"demo-{a}-{b}-{random.randint(10,99)}"
    return first, last, uname_base

def _sanitize_display_name(s: str) -> tuple[str, str]:
    """
    Split a provided 'preferred_name' like 'Malo Renard' or 'Malo' into (first,last).
    Non-letters are removed for display. Falls back to ('Demo','User') if empty.
    """
    s = (s or "").strip()
    s = re.sub(r"[^A-Za-zÀ-ÿ' -]", "", s)  # keep letters, accents, spaces, hyphens
    if not s:
        return "Demo", "User"
    parts = [p for p in s.split() if p]
    if len(parts) == 1:
        return parts[0].title(), "Demo"
    return parts[0].title(), " ".join(p.title() for p in parts[1:])


# keep your existing constants
BLACKLIST_DEMO_ROLES = {"admin"}

def _normalize_roles(raw):
    """
    Accept roles from POST JSON in either 'role' (string) or 'roles' (list) form.
    Lowercase + de-dupe.
    Always ensure 'demo' is present.
    """
    roles = set()

    # accept "role": "teacher" or "roles": ["teacher","farmer"]
    if isinstance(raw, str):
        roles.add(raw)
    elif isinstance(raw, (list, tuple, set)):
        roles.update(raw)

    # clean
    roles = {str(r).strip().lower() for r in roles}

    # always enforce demo baseline
    roles.add("demo")

    # blacklist forbidden roles
    roles = {r for r in roles if r not in BLACKLIST_DEMO_ROLES}

    return roles


@api_view(["GET"])
@permission_classes([AllowAny])
def hello(_req):
    return JsonResponse({"service":"django", "message":"Hello from Django"})
 
   
  

@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    demo_exp = None
    try:
        acct = u.demo_account
        if not acct.expired:
            demo_exp = acct.expires_at.isoformat()
    except ObjectDoesNotExist:
        pass

    roles = list(u.groups.values_list("name", flat=True))

    return JsonResponse({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "lang": u.lang,  
        "is_demo": "demo" in roles,
        "roles": roles,
        "demo_expires_at": demo_exp,
    })




 
####################################################################
#  ViewSet
##############################################################
# UserCore/views.py (inside UserViewSet)

class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        qs = (CustomUser.objects
              .select_related('demo_account')
              .prefetch_related('groups'))
        u = self.request.user
        if u.is_superuser or u.groups.filter(name='admin').exists():
            return qs
        return qs.filter(id=u.id)  # 🔒 non-admins only see themselves

    def get_permissions(self):
        # Model-level CRUD stays admin-only
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        # Actions like 'me' are auth-only
        return [permissions.IsAuthenticated()]

    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        GET  /users/me/   → current user details (incl. roles)
        PATCH /users/me/  → update first_name, last_name, lang (NOT roles unless admin)
        """
        user = request.user
        if request.method.lower() == 'get':
            data = self.get_serializer(user).data
            return Response(data)

        # PATCH
        serializer = self.get_serializer(
            user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()  # update logic enforced in serializer.update()
        return Response(serializer.data)

  
    

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def teacher_list(self, request):
        teachers = CustomUser.objects.filter(groups__name="teacher")
        serializer = self.get_serializer(teachers, many=True)
        return Response(serializer.data)
 

class UserRolesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_groups = request.user.groups.all()  # Get all groups for the user
        roles = [group.name for group in user_groups]  # Collect group names as roles
        return Response({'roles': roles})

####################################################################
#  DEMO user
###############################################################
  
from CompetenceCore.demo_linking import attach_demo_teacher_relations



DEMO_COOKIE = "demo_sid"
DEMO_DAYS = 30


from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny

 



class DemoStartThrottle(ScopedRateThrottle):
    scope = "demo_start"   

@api_view(["POST"])
@throttle_classes([DemoStartThrottle])
@permission_classes([AllowAny])
def demo_start(request):
    return _issue_demo_response(request)

# 👉 DRF has no @throttle_scope for FBVs; set it like this:

demo_start.throttle_scope = "demo_start"

@api_view(["POST"])
@throttle_classes([DemoStartThrottle])   
@permission_classes([AllowAny])
def demo_reset(request):
    sid = request.COOKIES.get(DEMO_COOKIE)
    if sid:
        DemoAccount.objects.filter(sid=sid, active=True).update(active=False)
    return _issue_demo_response(request)



@transaction.atomic
def _issue_demo_response(request) -> Response:
    """
    Create or reuse a demo user bound to a browser via DEMO_COOKIE.

    - If DEMO_COOKIE points to an active, non-expired DemoAccount whose user is active:
        → reuse that user, possibly add missing roles, update language.
    - If the DemoAccount is expired OR the user is inactive:
        → mark DemoAccount inactive and treat as no account; create a fresh demo user.

    Returns a JWT access token and sets DEMO_COOKIE.
    """
    User = get_user_model()
    sid = request.COOKIES.get(DEMO_COOKIE)
    acct = None

    if sid:
        acct = (
            DemoAccount.objects
            .select_related("user")
            .filter(sid=sid, active=True)
            .first()
        )
        if acct:
            # Expired by time or DemoAccount flag → deactivate and discard
            if acct.expired:
                acct.active = False
                acct.save(update_fields=["active"])
                acct = None
            # Demo user has been deactivated in Django admin → also invalidate demo
            elif not acct.user.is_active:
                acct.active = False
                acct.save(update_fields=["active"])
                acct = None

    # Parse body (may be empty)
    try:
        body = request.data or {}
    except Exception:
        body = {}

    requested_roles = _normalize_roles(body.get("roles") or body.get("role") or [])
    preferred_name = body.get("preferred_name") or body.get("display_name")
    lang = body.get("lang")
    language = lang if lang in ALLOWED_LANGS else 'en'

    groups_by_name = {g.name: g for g in Group.objects.filter(name__in=ALLOWED_DEMO_ROLES)}

    def ensure_group(name: str) -> Group:
        g = groups_by_name.get(name)
        if g:
            return g
        g, _ = Group.objects.get_or_create(name=name)
        groups_by_name[name] = g
        return g

    if not acct:
        # --- New demo user ---
        if preferred_name:
            first, last = _sanitize_display_name(preferred_name)
            uname_base = f"demo-{slugify(first)}-{slugify(last)}"
        else:
            first, last, uname_base = _generate_codename()

        username = _unique_username(uname_base, User)
        user = User.objects.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            first_name=first,
            last_name=last,
            lang=language,
        )

        # Ensure base roles + requested ones
        final_roles = {"demo"} | requested_roles
        for r in final_roles:
            user.groups.add(ensure_group(r))

        acct = DemoAccount.objects.create(
            user=user,
            sid=secrets.token_urlsafe(32),
            expires_at=timezone.now() + datetime.timedelta(days=DEMO_DAYS),
        )

    else:
        # --- Existing demo reused ---
        user = acct.user

        # Add any missing roles ("demo" enforced)
        existing = set(user.groups.values_list("name", flat=True))
        missing = ({"demo"} | requested_roles) - existing
        for r in missing:
            user.groups.add(ensure_group(r))

        # Update language if requested
        if language and user.lang != language:
            user.lang = language
            user.save(update_fields=["lang"])

    # ✅ Centralized wiring: only if the user is *currently* in both groups
    user_roles_now = set(user.groups.values_list("name", flat=True))
    if "teacher" in user_roles_now:
        attach_demo_teacher_relations(user, language=language)

    roles = list(user_roles_now)

    access = AccessToken.for_user(user)
    access["roles"] = roles
    access["is_demo"] = ("demo" in roles)
    access["demo_exp"] = int(acct.expires_at.timestamp())
    access["lang"] = user.lang

    resp = Response({
        "access": str(access),
        "expires_in": 15 * 60,
        "demo_expires_at": acct.expires_at.isoformat(),
        "roles": roles,
        "username": user.username,
        "lang": user.lang,
    })
    resp.set_cookie(
        DEMO_COOKIE,
        acct.sid,
        max_age=DEMO_DAYS * 24 * 3600,
        httponly=True,
        secure=not DEBUG,
        samesite="Lax",
    )
    return resp


@api_view(["GET"])
@permission_classes([AllowAny])
def info(_req):
    """
    Public, read-only system info.
    Only aggregated data. Removes sensitive groups like 'admin'.
    """

    # Public-facing apps
    public_apps = []
    for app_cfg in apps.get_app_configs():
        name = app_cfg.name
        if name.startswith("django.") or name.startswith("rest_framework"):
            continue
        public_apps.append({
            "label": app_cfg.label,
            "name": name,
        })

    # Public roles only — NEVER expose internal/admin roles
    allowed_public_roles = {"demo", "teacher", "farmer", "analytics", "statistics"}
    roles = (
        Group.objects
        .filter(name__in=allowed_public_roles)
        .values_list("name", flat=True)
        .order_by("name")
    )

    # User stats (aggregate only)
    total_users = CustomUser.objects.count()
    active_demo = DemoAccount.objects.filter(
        active=True, expires_at__gt=timezone.now()
    ).count()

    lang_stats = list(
        CustomUser.objects
        .values("lang")
        .annotate(count=Count("id"))
        .order_by("lang")
    )

    payload = {
        "service": "django",
        "timestamp": timezone.now().isoformat(),
        "environment": "dev" if settings.DEBUG else "prod",

        "apps": public_apps,

        "auth": {
            "roles": list(roles),   # ONLY the safe subset
        },

        "users": {
            "total": total_users,
            "demo_active": active_demo,
            "by_language": lang_stats,
        },
    }

    return Response(payload)



@api_view(["GET"])
@permission_classes([AllowAny])
def demo_status(request):
    """
    Check whether the current browser (via DEMO_COOKIE) has a still-valid demo account.

    A demo is considered valid iff:
      - DemoAccount exists for the cookie `sid`,
      - DemoAccount.active is True,
      - DemoAccount.expires_at is in the future,
      - AND the linked CustomUser.is_active is True.

    Otherwise we return has_active_demo = False and the frontend will show the demo form.
    """
    sid = request.COOKIES.get(DEMO_COOKIE)
    acct = None

    if sid:
        acct = (
            DemoAccount.objects
            .select_related("user")
            .filter(sid=sid, active=True)
            .first()
        )

        if acct:
            # Expired by time or by DemoAccount flag → treat as none
            if acct.expired:
                acct = None
            # Demo user deactivated in Django admin → also invalidate this demo
            elif not acct.user.is_active:
                acct.active = False
                acct.save(update_fields=["active"])
                acct = None

    if not acct:
        return Response({"has_active_demo": False})

    u = acct.user
    return Response({
        "has_active_demo": True,
        "username": u.username,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "demo_expires_at": acct.expires_at.isoformat(),
    })
