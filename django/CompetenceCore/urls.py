from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NiveauViewSet, EtapeViewSet, AnneeViewSet, MatiereViewSet, 
     GroupageDataViewSet, ItemViewSet,
   ScoreRulePointViewSet, EleveViewSet,CatalogueViewSet,
     api_overview, ShortReportViewSet,TranslationView,
    EleveReportsView,PDFLayoutViewSet,FullReportViewSet,MyImageBase64View
)
# UserViewSet, UserRolesView

router = DefaultRouter()
router.register(r'niveaux', NiveauViewSet)
router.register(r'etapes', EtapeViewSet)
router.register(r'annees', AnneeViewSet)
router.register(r'matieres', MatiereViewSet)
#router.register(r'scorerules', ScoreRuleViewSet)
#router.register(r'eleves/anonymized', EleveAnonymizedViewSet, basename='eleve-anonymized')  
#router.register(r'resultats', ResultatViewSet)   
#router.register(r'resultatdetails', ResultatDetailViewSet)
#router.register(r'reports', ReportViewSet)
#router.register(r'reportcatalogues', ReportCatalogueViewSet)
#router.register(r'full-reports', ReportFRViewSet, basename='full-report')
router.register(r'eleves', EleveViewSet, basename='eleve')   
router.register(r'scorerulepoints', ScoreRulePointViewSet)
router.register(r'catalogues', CatalogueViewSet, basename='catalogue')
router.register(r'groupages', GroupageDataViewSet , basename='groupagedata')
router.register(r'items', ItemViewSet, basename='item') 
router.register(r'pdf_layouts', PDFLayoutViewSet, basename='pdf_layouts')
router.register(r'fullreports', FullReportViewSet, basename='fullreport')
router.register(r'shortreports', ShortReportViewSet, basename='shortreport')

# router.register(r'users', UserViewSet) # is part of UserCore 

urlpatterns = [
    path('overview/', api_overview, name='api-overview'),
    #path('user/roles/', UserRolesView.as_view(), name='user-roles'),
    path('eleve/<int:eleve_id>/reports/', EleveReportsView.as_view(), name='eleve-reports'), 
    path('myimage/<int:myimage_id>/base64/', MyImageBase64View.as_view(), name='myimagebase64'), 

    path('translations/', TranslationView.as_view(), name='translations'),
    path('', include(router.urls)),  # Include all router URLs
]

