# competence/views.py

from django.shortcuts import get_object_or_404  # Add this import at the top of your file

from rest_framework import  viewsets 
from rest_framework.permissions import IsAuthenticated
from .permissions import isAllowedApiView,isAllowed,IsEleveProfessor

from .models import (
    Niveau, Etape, Annee, Matiere, Eleve, Catalogue, GroupageData,MyImage,
    Item , Resultat, ResultatDetail,ScoreRule ,ScoreRulePoint,PDFLayout,Report,ReportCatalogue
)
 
from .serializers import (
    NiveauSerializer, EtapeSerializer, AnneeSerializer, MatiereSerializer, EleveSerializer, EleveAnonymizedSerializer, CatalogueSerializer,
    ReportCatalogueSerializer,ResultatDetailSerializer, ResultatSerializer,ScoreRuleSerializer,   ScoreRulePointSerializer,
    PDFLayoutSerializer, FullReportSerializer,ShortReportSerializer,
    GroupageDataSerializer,ItemSerializer,MyImageSerializer
)

from django.db.models import Prefetch
 
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.db.models import F
  
from django.contrib.auth.models import  Group 
from django.shortcuts import render
 
from rest_framework import status
from django.utils import timezone
#from drf_yasg.utils import swagger_auto_schema
#from drf_yasg import openapi    
import base64 
from django.http import JsonResponse 
from .models import Translation




@api_view(['GET'])
def api_overview(request):
    return Response({
        "overview": request.build_absolute_uri('/api/overview/'), 
        "niveaux": request.build_absolute_uri('/api/niveaux/'),
        "etapes": request.build_absolute_uri('/api/etapes/'),
        "annees": request.build_absolute_uri('/api/annees/'),
        "matieres": request.build_absolute_uri('/api/matieres/'),
#        "scorerules": request.build_absolute_uri('/api/scorerules/'),
        "scorerulepoints": request.build_absolute_uri('/api/scorerulepoints/'),
        "eleves": request.build_absolute_uri('/api/eleves/'),
#        "eleves_anonymized": request.build_absolute_uri('/api/eleves/anonymized/'),
        "catalogues": request.build_absolute_uri('/api/catalogues/'),
        "groupages": request.build_absolute_uri('/api/groupages/'),
        "items": request.build_absolute_uri('/api/items/'),
#        "resultats": request.build_absolute_uri('/api/resultats/'),
#        "resultatdetails": request.build_absolute_uri('/api/resultatdetails/'),
        "eleve_reports": request.build_absolute_uri('/api/eleve/{eleve_id}/reports/'),    
        "pdf_layouts": request.build_absolute_uri('/api/pdf-layouts/'),
#        "full_report_create": request.build_absolute_uri('/api/reports/full-create/'),  # New addition
        "fullreports": request.build_absolute_uri('/api/fullreports/'),  
        "shortreports": request.build_absolute_uri('/api/shortreports/'),  
        "myimages": request.build_absolute_uri('/api/myimages/'),  
        "eleve_reports": request.build_absolute_uri('/api/eleve/{eleve_id}/reports/').replace("{eleve_id}", "<eleve_id>"),
        "myimagebase64": request.build_absolute_uri('/api/myimage/{myimage_id}/base64/').replace("{myimage_id}", "<myimage_id>"),
        "translation": request.build_absolute_uri('/api/translation/{lang}').replace("{lang}", "<lang>"),
       

    })


 




def custom_404(request, exception):
    return render(request, '404.html', status=404)

  
####################################################################
#  request without  login 
##############################################################
# views.py
class TranslationView(APIView):
    def get(self, request):
        lang = request.query_params.get('lang', 'en')
        # key+ref_id → text map; if you truly need a flat map, you can emit "key: {ref_id: text}" etc.
        rows = Translation.objects.filter(language=lang)
        data = {(t.key, t.ref_id): t.text for t in rows}

        if lang != 'en':
            fb = Translation.objects.filter(language='en')
            for t in fb:
                data.setdefault((t.key, t.ref_id), t.text)

        return Response(data, status=status.HTTP_200_OK)
 

####################################################################
#  APIView .... in this case we just have defined a GET
##############################################################

 # path('eleve/<int:eleve_id>/reports/', EleveReportsView.as_view(), name='eleve-reports'), 


class EleveReportsView(APIView):
    permission_classes = [IsAuthenticated, isAllowedApiView]

    def get(self, request, eleve_id):
        # Check if the Eleve exists
        try:
            eleve = Eleve.objects.get(id=eleve_id)
        except Eleve.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        # Check if the authenticated user is associated with the Eleve
        if request.user not in eleve.professeurs.all():
            return Response(status=status.HTTP_403_FORBIDDEN)
            #return Response(status=status.HTTP_407_PROXY_AUTHENTICATION_REQUIRED)

        # Retrieve reports for the Eleve
        reports = eleve.reports.all()
        serializer = FullReportSerializer(reports, many=True, context={'request': request}) 
        return Response(serializer.data, status=status.HTTP_200_OK)
    
 
    # Note: No 'create' action is implemented here since reports should be created through the api/reports endpoint.

    def post(self, request, eleve_id):
        # Logic for creating a report (if allowed for teachers)
        pass

    def put(self, request, eleve_id):
        # Logic for updating a report (if allowed for teachers)
        pass

    def delete(self, request, eleve_id):
        # Logic for deleting a report (if allowed for teachers)
        pass




####################################################################
#  ViewSet
##############################################################
 

class EleveViewSet(viewsets.ModelViewSet):
    serializer_class = EleveSerializer
    permission_classes = [IsAuthenticated, isAllowed]

    def get_queryset(self):
        user = self.request.user
        
        # Admin can view all eleves
        if user.groups.filter(name='admin').exists():
            return Eleve.objects.all()

        # Teacher can view only their assigned eleves
        elif user.groups.filter(name='teacher').exists():
            # Return only the Eleve objects associated with the current teacher
            return Eleve.objects.filter(professeurs=user).distinct()

        # Return empty for any other user
        return Eleve.objects.none()

    def perform_create(self, serializer):
        """
        Automatically assign the current teacher as a professor when creating a new eleve.
        """
        user = self.request.user
        
        # If the user is a teacher, automatically assign them to the 'professeurs' field
        if user.groups.filter(name='teacher').exists():
            serializer.save(professeurs=[user])  # Save the teacher in the professeurs field
        else:
            serializer.save()  # Admins can assign multiple professeurs as per their selection


class EleveAnonymizedViewSet(viewsets.ModelViewSet):
    serializer_class = EleveAnonymizedSerializer
    permission_classes = [IsAuthenticated, isAllowed]
    queryset = Eleve.objects.none()  # Default queryset

    def get_queryset(self):
        user = self.request.user

        # Admin can see all students
        if user.groups.filter(name='admin').exists():
            return Eleve.objects.all()

        # Analytics/Statistics users can see all students, but without nom and prenom
        elif user.groups.filter(name='analytics').exists():
            return Eleve.objects.all()

        # Other users get no access
        return Eleve.objects.none()


 

class NiveauViewSet(viewsets.ModelViewSet):
    queryset = Niveau.objects.all()
    serializer_class = NiveauSerializer
    permission_classes = [ IsAuthenticated, isAllowed]

class EtapeViewSet(viewsets.ModelViewSet):
    queryset = Etape.objects.all()
    serializer_class = EtapeSerializer
    permission_classes = [IsAuthenticated, isAllowed]


 



class AnneeViewSet(viewsets.ModelViewSet):
    queryset = Annee.objects.all()
    serializer_class = AnneeSerializer
    permission_classes = [IsAuthenticated, isAllowed]

    def perform_create(self, serializer):
        # Custom logic when creating a new Annee
        # Note: The default start_date is handled by the model's save method
        serializer.save()

    def perform_update(self, serializer):
        # Custom logic when updating an Annee
        if not serializer.validated_data.get('stop_date') and not serializer.validated_data.get('is_active'):
            serializer.validated_data['stop_date'] = timezone.now().date()
        serializer.save()


class MatiereViewSet(viewsets.ModelViewSet):
    queryset = Matiere.objects.all()
    serializer_class = MatiereSerializer
    permission_classes = [IsAuthenticated, isAllowed]

class ScoreRuleViewSet(viewsets.ModelViewSet):
    queryset = ScoreRule.objects.all()
    serializer_class = ScoreRuleSerializer
    permission_classes = [IsAuthenticated, isAllowed]

class ScoreRulePointViewSet(viewsets.ModelViewSet):
    queryset = ScoreRulePoint.objects.all()
    serializer_class = ScoreRulePointSerializer
    permission_classes = [IsAuthenticated, isAllowed]


class CatalogueViewSet(viewsets.ModelViewSet):
    serializer_class = CatalogueSerializer
    permission_classes = [IsAuthenticated, isAllowed]

    def get_queryset(self):
        user = self.request.user

        # Admin users can see all catalogues
        if user.groups.filter(name='admin').exists():
            return Catalogue.objects.all()

        # Analytics users can see all catalogues (but perhaps without some fields, if needed)
        elif user.groups.filter(name='analytics').exists():
            return Catalogue.objects.all()

        # Teachers can only see the catalogues they are associated with
        elif user.groups.filter(name='teacher').exists():
            return Catalogue.objects.filter(professeurs=user)

        # Other users get no access to catalogues
        return Catalogue.objects.none()

 


class GroupageDataViewSet(viewsets.ModelViewSet):
    serializer_class = GroupageDataSerializer
    permission_classes = [IsAuthenticated, isAllowed]

    def get_queryset(self):
        catalogue_id = self.request.query_params.get('catalogue', None)
        if catalogue_id:
            return GroupageData.objects.filter(catalogue_id=catalogue_id).prefetch_related('item_set')
        return GroupageData.objects.all()
 

class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated, isAllowed]

    def get_queryset(self):
        groupagedata_id = self.request.query_params.get('groupagedata', None)
        if groupagedata_id:
            # Filter items based on the groupagedata_id
            return Item.objects.filter(groupagedata_id=groupagedata_id)
        return Item.objects.all()



class ResultatViewSet(viewsets.ModelViewSet):
    queryset = Resultat.objects.all()
    serializer_class = ResultatSerializer
    permission_classes = [IsAuthenticated, isAllowed]

    def get_queryset(self):
        queryset = super().get_queryset()
        eleve_id = self.request.query_params.get('eleve_id', None)
        if eleve_id is not None:
            queryset = queryset.filter(eleve_id=eleve_id)
        return queryset

class ResultatDetailViewSet(viewsets.ModelViewSet):
    queryset = ResultatDetail.objects.all()
    serializer_class = ResultatDetailSerializer
 
    permission_classes = [IsAuthenticated, isAllowed]

    def get_queryset(self):
        queryset = super().get_queryset()
        resultat_id = self.request.query_params.get('resultat_id', None)
        if resultat_id is not None:
            queryset = queryset.filter(resultat_id=resultat_id)
        return queryset
  

class PDFLayoutViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, isAllowed]
    queryset = PDFLayout.objects.all()
    serializer_class = PDFLayoutSerializer
 
 
class MyImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, isAllowed]
    queryset = MyImage.objects.all()
    serializer_class = MyImageSerializer
 
 

class MyImageBase64View(APIView):
    permission_classes = [IsAuthenticated, isAllowedApiView]
    def get(self, request, myimage_id):
        try:
            my_image = MyImage.objects.get(id=myimage_id)
            with open(my_image.icon.path, 'rb') as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            return Response({'image_base64': f'data:image/png;base64,{encoded_string}'}, status=status.HTTP_200_OK)
        except MyImage.DoesNotExist:
            return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)
        
 

 


class ReportCatalogueViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, isAllowed]
    queryset = ReportCatalogue.objects.all()
    serializer_class = ReportCatalogueSerializer

class FullReportViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsEleveProfessor]
    serializer_class = FullReportSerializer

    def retrieve(self, request, *args, **kwargs):
        report_id = kwargs.get('pk')
        #print(f"Attempting to retrieve report with id: {report_id}")
        
        report = get_object_or_404(Report, id=report_id)
        #print(f"Retrieved report: {report}")

        try:
            eleve = Eleve.objects.get(id=report.eleve_id)
            #print(f"Associated Eleve: {eleve}")
        except Eleve.DoesNotExist:
            return Response({'detail': 'Associated Eleve does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        if not self.has_access_to_report(report):
            return Response({'detail': 'You do not have access to this report.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(report)
        return Response(serializer.data)

    def has_access_to_report(self, report):
        # Check if the user is a professor for the associated Eleve of the report
        has_access = report.eleve.professeurs.filter(id=self.request.user.id).exists()
        #if has_access:
        #    print(f"User {self.request.user.id} has access to report {report.id}.")
        #else:
        #    print(f"User {self.request.user.id} does NOT have access to report {report.id}.")
        return has_access

    def get_queryset(self):
        user = self.request.user

        if user.groups.filter(name='admin').exists():
            return Report.objects.all()  # Admins have full access

        if user.groups.filter(name='analytics').exists() and user.is_authenticated:
            return Report.objects.none()  # Analytics users not allowed to view reports

        if user.groups.filter(name='teacher').exists() and user.is_authenticated:
            # Return reports for eleves associated with this teacher
            return Report.objects.filter(eleve__professeurs=user).distinct().order_by('-updated_at')
        
        return Report.objects.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)  # Validate incoming data
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

  

class ShortReportViewSet(viewsets.ReadOnlyModelViewSet):
    """
    A viewset that provides read-only access (list and retrieve)
    for report data, ordered by 'updated_at' in descending order.
    """
    permission_classes = [IsAuthenticated]  # Only authentication required, no specific permissions
    serializer_class = ShortReportSerializer

    def get_queryset(self):
        user = self.request.user

        # Admin access: Retrieve all reports ordered by 'updated_at' descending
        if user.groups.filter(name='admin').exists():
            return Report.objects.all().order_by('-updated_at')

        # Analytics access: Retrieve all reports ordered by 'updated_at' descending
        if user.groups.filter(name='analytics').exists() and user.is_authenticated:
            return Report.objects.all().order_by('-updated_at')  # Allow analytics to retrieve reports

        # Teacher-specific access
        if user.groups.filter(name='teacher').exists() and user.is_authenticated:
            # Get all Eleves associated with the teacher
            accessible_eleves = user.eleves.values_list('id', flat=True) 
            return Report.objects.filter(eleve_id__in=accessible_eleves).distinct().order_by('-updated_at')

        # Default: No access for other user types
        return Report.objects.none()

    # The viewset will automatically handle list() and retrieve() methods for read-only access