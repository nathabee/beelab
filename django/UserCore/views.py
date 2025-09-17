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
from rest_framework.permissions import AllowAny
from  .permissions import  isAllowedApiView, isAllowed
from rest_framework.permissions import IsAuthenticated 

from rest_framework.views import APIView


from .models import CustomUser
from .models import DemoAccount
from django.contrib.auth.models import Group


from .serializers import  UserSerializer 
from django.contrib.auth import get_user_model  
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.decorators import api_view, permission_classes, throttle_classes 
              


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
    if hasattr(u, "demo_account") and u.demo_account and not u.demo_account.expired:
        demo_exp = u.demo_account.expires_at.isoformat()
    return JsonResponse({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "is_demo": u.groups.filter(name="demo").exists(),
        "demo_expires_at": demo_exp,
    })


 
####################################################################
#  ViewSet
##############################################################

class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, isAllowed]
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.IsAdminUser()]  # Only admins can list users
        elif self.action == 'me':
            return [permissions.IsAuthenticated()]  # Authenticated users can access their own info
        elif self.action == 'teacher_list':
            return [IsAuthenticated()]  # Authenticated users can access the teacher list
        return super().get_permissions()  # Default permissions for other actions

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def teacher_list(self, request):
        # Find all users who belong to the 'teacher' group
        teacher_group = Group.objects.get(name="teacher")
        teachers = CustomUser.objects.filter(groups=teacher_group)
        serializer = self.get_serializer(teachers, many=True)
        return Response(serializer.data)
 

class UserRolesView(APIView):
    permission_classes = [IsAuthenticated, isAllowedApiView]

    def get(self, request):
        user_groups = request.user.groups.all()  # Get all groups for the user
        roles = [group.name for group in user_groups]  # Collect group names as roles
        return Response({'roles': roles})

####################################################################
#  DEMO user
###############################################################
  

DEMO_COOKIE = "demo_sid"
DEMO_DAYS = 30

class DemoStartThrottle(ScopedRateThrottle):
    scope = "demo_start"

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([DemoStartThrottle])
def demo_start(request):
    return _issue_demo_response(request)

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([DemoStartThrottle])
def demo_reset(request):
    sid = request.COOKIES.get(DEMO_COOKIE)
    if sid:
        DemoAccount.objects.filter(sid=sid, active=True).update(active=False)
    return _issue_demo_response(request)


def _issue_demo_response(request) -> Response:
    """
    Shared logic to create/reuse a demo account and return a Response
    with JWT + cookie. Safe to call from both start/reset.
    """
    User = get_user_model()
    sid = request.COOKIES.get(DEMO_COOKIE)
    acct = None
    if sid:
        acct = DemoAccount.objects.select_related("user").filter(sid=sid, active=True).first()
        if acct and acct.expired:
            acct.active = False
            acct.save()
            acct = None

    if not acct:
        demo_group, _ = Group.objects.get_or_create(name="demo")
        username = f"demo_{secrets.token_hex(6)}"
        # random password just to satisfy the field; auth is JWT-only
        user = User.objects.create_user(
            username=username,
            password=secrets.token_urlsafe(16),
            first_name="Demo",
            last_name="User",
        )
        user.groups.add(demo_group)
        acct = DemoAccount.objects.create(
            user=user,
            sid=secrets.token_urlsafe(32),
            expires_at=timezone.now() + datetime.timedelta(days=DEMO_DAYS),
        )

    access = AccessToken.for_user(acct.user)
    access["role"] = "demo"
    access["demo_exp"] = int(acct.expires_at.timestamp())

    resp = Response(
        {"access": str(access), "expires_in": 15 * 60, "demo_expires_at": acct.expires_at.isoformat()}
    )
    resp.set_cookie(
        DEMO_COOKIE,
        acct.sid,
        max_age=DEMO_DAYS * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="Lax",
    )
    return resp

 


