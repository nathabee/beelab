# UserCore/views.py
# 
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes,authentication_classes , action
from rest_framework.permissions import IsAuthenticated
 
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework.permissions import AllowAny

from rest_framework.views import APIView

from  .permissions import  isAllowedApiView, isAllowed
from rest_framework.permissions import IsAuthenticated

from rest_framework import permissions, viewsets
from .models import CustomUser

from rest_framework.response import Response
from django.contrib.auth.models import Group

from .serializers import  UserSerializer

 

@api_view(["GET"])
@permission_classes([AllowAny])
def hello(_req):
    return JsonResponse({"service":"django", "message":"Hello from Django"})
 
  

@api_view(["GET"])
@authentication_classes([JWTAuthentication])   # <- important
@permission_classes([IsAuthenticated])
def me(request):
    u = request.user
    return JsonResponse({"id": u.id, "username": u.username, "email": u.email})

 

 
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

 