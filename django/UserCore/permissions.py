# UserCore/permissions.py
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsDemo(BasePermission):
    """
    If user is demo and active -> allow SAFE methods by default.
    Otherwise, don't interfere (return True to let other permissions decide).
    """
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.groups.filter(name='demo').exists()):
            return True  # not demo → let others decide

        try:
            acct = u.demo_account
        except ObjectDoesNotExist:
            return False
        if acct.expired:
            return False

        # ViewSet: allow specific actions; APIView: allow SAFE HTTP methods
        action = getattr(view, 'action', None)
        if action is not None:
            allowed_actions = {
                # 'SomeReadOnlyViewSet': {'list', 'retrieve'},
            }
            if action in allowed_actions.get(view.__class__.__name__, set()):
                return True
            return request.method in SAFE_METHODS
        else:
            return request.method in SAFE_METHODS


class DemoExpiryPermission(BasePermission):
    """
    If the user is a demo, ensure it has not expired.
    """
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated and u.groups.filter(name='demo').exists()):
            return True
        # Prefer DB check to prevent client tampering
        acct = getattr(u, "demo_account", None)
        return bool(acct and not acct.expired)
