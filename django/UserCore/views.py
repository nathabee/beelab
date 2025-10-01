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
 
from CompetenceCore.models import Catalogue  # <-- import catalogue model

# keep your existing constants
ALLOWED_DEMO_ROLES = {"demo", "teacher", "farmer"}  # no 'admin'
ALLOWED_LANGS = {"en", "fr", "de", "br"}

# map demo language to its catalogue IDs (as in your fixtures)
LANG_TO_DEMO_CATALOGUES = {
    "fr": [34, 35, 36],  # jacques
    "de": [43, 44, 45],  # jakob
    "br": [40, 41, 42],  # jakez (Breton)
    "en": [37, 38, 39],  # james
}
ALL_MAPPED_CATALOGUE_IDS = {cid for ids in LANG_TO_DEMO_CATALOGUES.values() for cid in ids}



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
ALLOWED_DEMO_ROLES = {"demo", "teacher", "farmer"}  # ❗️ NO 'admin' here

def _normalize_roles(raw):
    """
    Accept roles from POST JSON in either 'role' (string) or 'roles' (list) form.
    Lowercase + de-dupe, intersect with whitelist.
    Always ensure 'demo' is present.
    """
    roles = set()
    if isinstance(raw, str):
        roles.add(raw)
    elif isinstance(raw, (list, tuple, set)):
        roles.update([str(x) for x in raw])
    roles = {r.strip().lower() for r in roles if isinstance(r, str)}
    roles.add("demo")  # ensure baseline
    return roles & ALLOWED_DEMO_ROLES


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
        "is_demo": "demo" in roles,
        "roles": roles,
        "demo_expires_at": demo_exp,
    })




 
####################################################################
#  ViewSet
##############################################################
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
        if self.action in ['list', 'create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]  # 🔒 only admins can manage users
        # actions like 'me' fall back to auth-only
        return [permissions.IsAuthenticated()]
    
 

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
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
  

DEMO_COOKIE = "demo_sid"
DEMO_DAYS = 30


from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny

def _assign_demo_catalogues(user, lang: str):
    """
    Ensure the demo user is linked to the language-specific catalogue set:
    - remove catalogues mapped to other demo languages
    - add any missing catalogues for the target language
    """
    target_ids = set(LANG_TO_DEMO_CATALOGUES.get(lang) or LANG_TO_DEMO_CATALOGUES["en"])

    # Remove only catalogues that are part of ANY mapped demo set but not our target
    to_remove_qs = user.catalogues.filter(id__in=ALL_MAPPED_CATALOGUE_IDS - target_ids)
    if to_remove_qs.exists():
        user.catalogues.remove(*to_remove_qs)

    # Add any missing target catalogue ids
    existing_ids = set(user.catalogues.values_list("id", flat=True))
    missing_ids = target_ids - existing_ids
    if missing_ids:
        add_qs = Catalogue.objects.filter(id__in=missing_ids)
        user.catalogues.add(*add_qs)



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
    User = get_user_model()
    sid = request.COOKIES.get(DEMO_COOKIE)
    acct = None
    if sid:
        acct = (DemoAccount.objects
                .select_related("user")
                .filter(sid=sid, active=True)
                .first())
        if acct and acct.expired:
            acct.active = False
            acct.save()
            acct = None

    # Parse body
    body = {}
    try:
        body = request.data or {}
    except Exception:
        body = {}

    requested_roles = _normalize_roles(body.get("roles") or body.get("role") or [])
    preferred_name = body.get("preferred_name") or body.get("display_name")
    lang = body.get("lang")
    lang = lang if lang in ALLOWED_LANGS else None

    # groups helper unchanged...
    groups_by_name = {g.name: g for g in Group.objects.filter(name__in=ALLOWED_DEMO_ROLES)}
    def ensure_group(name: str) -> Group:
        g = groups_by_name.get(name)
        if g: return g
        g, _ = Group.objects.get_or_create(name=name)
        groups_by_name[name] = g
        return g

    if not acct:
        # --- New demo user ---
        # (use your existing name generation; shown compactly here)
        if preferred_name:
            first, last = _sanitize_display_name(preferred_name)
            uname_base = f"demo-{slugify(first)}-{slugify(last)}"
        else:
            first, last, uname_base = _generate_codename()  # or your human-name generator

        username = _unique_username(uname_base, User)
        user = User.objects.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            first_name=first,
            last_name=last,
            lang=lang or 'en',                  # <-- set lang at creation
        )

        # roles
        final_roles = {"demo"} | requested_roles
        for r in final_roles:
            user.groups.add(ensure_group(r))

        # link the demo catalogues for this language
        _assign_demo_catalogues(user, user.lang)

        acct = DemoAccount.objects.create(
            user=user,
            sid=secrets.token_urlsafe(32),
            expires_at=timezone.now() + datetime.timedelta(days=DEMO_DAYS),
        )
    else:
        # --- Existing demo reused ---
        user = acct.user

        # add any missing roles
        existing = set(user.groups.values_list("name", flat=True))
        missing = ({"demo"} | requested_roles) - existing
        for r in missing:
            user.groups.add(ensure_group(r))

        # update lang if requested and different
        if lang and user.lang != lang:
            user.lang = lang
            user.save(update_fields=["lang"])

        # ensure catalogue links match language mapping
        _assign_demo_catalogues(user, user.lang)

        # optionally refresh names if you want (keep your current logic)

    roles = list(user.groups.values_list("name", flat=True))

    access = AccessToken.for_user(user)
    access["roles"] = roles
    access["is_demo"] = True
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


