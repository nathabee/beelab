# CompetenceCore/permissions.py
from django.apps import apps
from rest_framework.permissions import BasePermission, SAFE_METHODS
from .models import Eleve

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or u.groups.filter(name='admin').exists()))
 

class IsEleveProfessor(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.groups.filter(name='teacher').exists())

    def has_object_permission(self, request, view, obj):
        Eleve = apps.get_model("competencecore", "Eleve")
        eleve_id = getattr(obj, 'eleve_id', None)
        if not eleve_id:
            return False
        try:
            eleve = Eleve.objects.get(id=eleve_id)
        except Eleve.DoesNotExist:
            return False
        return (
            eleve.professeurs.filter(id=request.user.id).exists()
            or (getattr(request.user, "is_demo_user", False) and getattr(eleve, "is_demo", False))
        )


 

class isAllowed(BasePermission):
    """
    Role matrix for **ViewSets only** (uses view.action).
    Admin: full access.
    Analytics: read-only on selected viewsets.
    Teacher: CRUD on allowed viewsets (minus excluded models).
    """
    def has_permission(self, request, view):
        action = getattr(view, 'action', None)
        if action is None:
            # Only for ViewSets (APIView has no .action)
            return False

        u = request.user
        if not (u and u.is_authenticated):
            return False

        if u.is_superuser or u.groups.filter(name='admin').exists():
            return True

        if u.groups.filter(name='analytics').exists():
            return self.is_allowed_for_analytics(view.__class__.__name__, action)

        if u.groups.filter(name='teacher').exists():
            return self.is_allowed_for_teacher(view.__class__.__name__, action, view)

        return False

    def is_allowed_for_analytics(self, view_name: str, action: str) -> bool:
        allowed = {
            'UserRolesView': ['list', 'retrieve'],
            'UserViewSet': ['list', 'retrieve'],
            'EleveViewSet': ['list', 'retrieve'],
            'EleveAnonymizedViewSet': ['list', 'retrieve'],
            'NiveauViewSet': ['list', 'retrieve'],
            'EtapeViewSet': ['list', 'retrieve'],
            'AnneeViewSet': ['list', 'retrieve'],
            'MatiereViewSet': ['list', 'retrieve'],
            'ScoreRuleViewSet': ['list', 'retrieve'],
            'ScoreRulePointViewSet': ['list', 'retrieve'],
            'CatalogueViewSet': ['list', 'retrieve'],
            'GroupageDataViewSet': ['list', 'retrieve'],
            'ItemViewSet': ['list', 'retrieve'],
            'ResultatViewSet': ['list', 'retrieve'],
            'ResultatDetailViewSet': ['list', 'retrieve'],
            'PDFLayoutViewSet': ['list', 'retrieve'],
            'ReportViewSet': ['list', 'retrieve'],
            'EleveReportsView': ['list', 'retrieve'],
            'ReportCatalogueViewSet': ['list', 'retrieve'],
            'MyImageViewSet': ['list', 'retrieve'],
        }
        return action in allowed.get(view_name, [])

    def is_allowed_for_teacher(self, view_name: str, action: str, view) -> bool:
        allowed = {
            'UserRolesView': ['list', 'retrieve'],
            'UserViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'EleveViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'EleveAnonymizedViewSet': ['list', 'retrieve'],
            'NiveauViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'EtapeViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'AnneeViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'MatiereViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'ScoreRuleViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'ScoreRulePointViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'CatalogueViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'GroupageDataViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'ItemViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'ResultatViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'ResultatDetailViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'PDFLayoutViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'ReportViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'EleveReportsView': ['list', 'retrieve'],
            'ReportCatalogueViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'MyImageViewSet': ['list', 'retrieve', 'create', 'update', 'partial_update', 'destroy'],
            'FullReportViewSet': ['create'],  # explicit
        }
        # enforce exclusions for destructive ops
        excluded_models = {'Annee', 'Etape', 'Catalogue', 'Niveau', 'Matiere'}

        if action in allowed.get(view_name, []):
            if action in {'create', 'update', 'partial_update', 'destroy'}:
                model_name = getattr(getattr(view, 'queryset', None), 'model', None)
                model_name = model_name.__name__ if model_name else None
                if model_name and model_name in excluded_models:
                    return False
            return True
        return False
 

class isAllowedApiView(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False

        view_name = view.__class__.__name__
        method = request.method.upper()

        if u.is_superuser or u.groups.filter(name='admin').exists():
            return True

        # ✅ teacher takes precedence over demo
        if u.groups.filter(name='teacher').exists():
            return self.is_allowed_for_teacher(view_name, method)

        if u.groups.filter(name='analytics').exists():
            return self.is_allowed_for_analytics(view_name, method)

        if u.groups.filter(name='demo').exists():  #case a demo without previous role
            return self.is_allowed_for_demo(view_name, method)

        return False


    def is_allowed_for_demo(self, view_name, method):
        allowed = {'UserRolesView': ['GET']}
        return method in allowed.get(view_name, [])

    def is_allowed_for_analytics(self, view_name, method):
        allowed = {
            'EleveReportsView': ['GET'],
            'UserRolesView': ['GET'],
            'MyImageBase64View': ['GET'],
        }
        return method in allowed.get(view_name, [])

    def is_allowed_for_teacher(self, view_name, method):
        allowed = {
            'EleveReportsView': ['GET'],
            'UserRolesView': ['GET'],
            'MyImageBase64View': ['GET'],
        }
        return method in allowed.get(view_name, [])
