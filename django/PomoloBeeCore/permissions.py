# PomoloBeeCore/permissions.py
from django.core.exceptions import ObjectDoesNotExist
from rest_framework.permissions import BasePermission, SAFE_METHODS

class FarmerOrReadOnlyDemo(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False

        if u.is_superuser or u.groups.filter(name='farmer').exists():
            return True

        if u.groups.filter(name='demo').exists():
            try:
                acct = u.demo_account
            except ObjectDoesNotExist:
                return False
            return (not acct.expired) and (request.method in SAFE_METHODS)

        return False
