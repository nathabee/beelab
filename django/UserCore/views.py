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
    Create/reuse a demo account and return a Response with JWT + cookie.
    Adds requested roles (whitelisted) to the demo user. Idempotent.
    """
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

    # 1) Parse desired roles from POST JSON
    body = {}
    try:
        body = request.data or {}
    except Exception:
        body = {}
    requested_roles = _normalize_roles(body.get("roles") or body.get("role") or [])

    # 2) Load/create groups for requested roles (create lazily)
    groups_by_name = {g.name: g for g in Group.objects.filter(name__in=ALLOWED_DEMO_ROLES)}
    def ensure_group(name: str) -> Group:
        g = groups_by_name.get(name)
        if g:
            return g
        g, _ = Group.objects.get_or_create(name=name)
        groups_by_name[name] = g
        return g

    if not acct:
        # New demo user
        username = f"demo_{secrets.token_hex(6)}"

        user = User.objects.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            first_name="Demo",
            last_name="User",
        )

        # Always add 'demo' and requested extras (filtered)
        final_roles = {"demo"} | requested_roles
        for r in final_roles:
            user.groups.add(ensure_group(r))

        acct = DemoAccount.objects.create(
            user=user,
            sid=secrets.token_urlsafe(32),
            expires_at=timezone.now() + datetime.timedelta(days=DEMO_DAYS),
        )
    else:
        # Existing demo: add any missing roles (idempotent)
        user = acct.user
        existing = set(user.groups.values_list("name", flat=True))
        missing = ({"demo"} | requested_roles) - existing
        for r in missing:
            user.groups.add(ensure_group(r))

    # Refresh list of roles for JWT + response
    roles = list(user.groups.values_list("name", flat=True))

    access = AccessToken.for_user(user)
    access["roles"] = roles              # ← include all roles
    access["is_demo"] = True
    access["demo_exp"] = int(acct.expires_at.timestamp())

    resp = Response({
        "access": str(access),
        "expires_in": 15 * 60,
        "demo_expires_at": acct.expires_at.isoformat(),
        "roles": roles,
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



