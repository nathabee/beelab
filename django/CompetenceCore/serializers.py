from rest_framework import serializers
from django.contrib.auth.models import  Group
from .models import (
    Niveau, Etape, Annee, Matiere, Eleve, Catalogue, GroupageData,PDFLayout,MyImage,
    Item, Resultat, ResultatDetail, ScoreRule, ScoreRulePoint, Report, ReportCatalogue
)

from rest_framework import serializers  
from django.utils import timezone
import base64
#from django.core.files.base import ContentFile
 
from UserCore.models import CustomUser  
from UserCore.serializers import UserSerializer  
from django.utils.translation import get_language
from CompetenceCore.models import Translation
import os

 
class TranslationMixin:
    """
    Helpers to fetch/store translations with graceful fallback.
    Order: explicit ?lang → user.lang → request.LANGUAGE_CODE → get_language() → 'en' 
    """
    _t_cache = None

    @staticmethod
    def _normalize_lang(code: str | None) -> str:
        m = {
            'en': 'en', 'fr': 'fr', 'de': 'de', 'bz': 'bz',
        }
        return m.get((code or 'en').lower(), 'en')

    def _lang(self) -> str:
        # Prefer request context if available
        req = getattr(self, 'context', {}).get('request') if hasattr(self, 'context') else None
        if req:
            # 1) explicit override via querystring
            try:
                qlang = (req.query_params.get('lang')  # DRF Request
                         or getattr(req, 'GET', {}).get('lang'))
                if qlang:
                    return self._normalize_lang(qlang)
            except Exception:
                pass

            # 2) logged-in user's profile language
            u = getattr(req, 'user', None)
            if getattr(u, 'is_authenticated', False):
                u_lang = getattr(u, 'lang', None)
                if u_lang:
                    return self._normalize_lang(u_lang)

            # 3) request.LANGUAGE_CODE (LocaleMiddleware)
            lc = getattr(req, 'LANGUAGE_CODE', None)
            if lc:
                return self._normalize_lang(lc)

        # 4) thread-local active language
        try:
            from django.utils.translation import get_language
            return self._normalize_lang(get_language())
        except Exception:
            return 'en'

    def _t(self, key: str, ref_id: int, default: str = "") -> str:
        if not ref_id:
            return default

        if self._t_cache is None:
            self._t_cache = {}

        lang = self._lang()
        cache_key = (key, ref_id, lang, default)
        if cache_key in self._t_cache:
            return self._t_cache[cache_key]

        qs = Translation.objects.filter(key=key, ref_id=ref_id)
        # 1) user language
        text = qs.filter(language=lang).values_list('text', flat=True).first()
        if text:
            self._t_cache[cache_key] = text
            return text
        # 2) english
        text = qs.filter(language='en').values_list('text', flat=True).first()
        if text:
            self._t_cache[cache_key] = text
            return text
        # 3) any available
        text = qs.values_list('text', flat=True).first()
        if text:
            self._t_cache[cache_key] = text
            return text
        # 4) default
        self._t_cache[cache_key] = default
        return default

    def _set_t(self, key: str, ref_id: int, text: str, language: str = None):
        if text is None or str(text).strip() == "":
            return
        lang = self._normalize_lang(language) if language else self._lang()
        Translation.objects.update_or_create(
            key=key, ref_id=ref_id, language=lang, defaults={"text": text}
        )


class EleveSerializer(TranslationMixin, serializers.ModelSerializer):
    # Automatically assign professeurs for non-admin users
    professeurs = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(groups__name='teacher'),
        many=True,
        write_only=True,
        required=False  # This field will not be required for teacher creation
    )

    professeurs_details = UserSerializer(many=True, read_only=True, source='professeurs')

    # For create/update, we use the niveau ID
    niveau_description = serializers.SerializerMethodField(read_only=True)

    def get_niveau_description(self, obj):
        # translation key = 'niveau'
        return self._t('niveau', obj.niveau.id, default=obj.niveau.niveau)

    class Meta:
        model = Eleve
        fields = ['id', 'nom', 'prenom', 'niveau','niveau_description', 'datenaissance', 'professeurs', 'professeurs_details']

    def create(self, validated_data):
        # If professeurs are provided (Admin case), pop them out of the validated_data
        professeurs = validated_data.pop('professeurs', None)
        
        # Create the Eleve object
        eleve = Eleve.objects.create(**validated_data)

        # If professeurs are passed (Admin), set them
        if professeurs:
            eleve.professeurs.set(professeurs)
        else:
            # For teachers, automatically assign the current user (teacher)
            request = self.context.get('request', None)
            if request and request.user.groups.filter(name='teacher').exists():
                eleve.professeurs.set([request.user])

        return eleve


    def update(self, instance, validated_data):
        # Get professeurs if available for admins
        professeurs = validated_data.pop('professeurs', None)

        # Update instance fields
        instance.nom = validated_data.get('nom', instance.nom)
        instance.prenom = validated_data.get('prenom', instance.prenom)
        instance.niveau = validated_data.get('niveau', instance.niveau)  # Use ID for niveau
        instance.datenaissance = validated_data.get('datenaissance', instance.datenaissance)

        if professeurs:
            instance.professeurs.set(professeurs)

        instance.save()
        return instance


class EleveAnonymizedSerializer(serializers.ModelSerializer):
    professeurs = UserSerializer(many=True, read_only=True)
    class Meta:
        model = Eleve
        fields = ['id', 'niveau', 'textnote1', 'textnote2', 'textnote3', 'professeurs']
        
# Serializer for Niveau
class NiveauSerializer(TranslationMixin, serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    class Meta:
        model = Niveau
        fields = ['id', 'niveau', 'description']

    def get_description(self, obj):
        return self._t('niveau', obj.id, default=obj.niveau)


# Serializer for Etape
class EtapeSerializer(TranslationMixin, serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    class Meta:
        model = Etape
        fields = ['id', 'etape', 'description']

    def get_description(self, obj):
        return self._t('etape', obj.id, default=obj.etape)


# Serializer for Annee
class AnneeSerializer(TranslationMixin, serializers.ModelSerializer):
    start_date = serializers.DateField(input_formats=['%Y-%m-%d'], required=False)
    stop_date  = serializers.DateField(input_formats=['%Y-%m-%d'], required=False)
    description = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Annee
        fields = ['id', 'is_active', 'start_date', 'stop_date', 'description']

    def get_description(self, obj):
        return self._t('annee', obj.id, default="")
        
    def create(self, validated_data):
        if not validated_data.get('start_date'):
            validated_data['start_date'] = timezone.now().date()
        return super().create(validated_data)

    def validate(self, attrs):
        is_active = attrs.get('is_active')
        start_date = attrs.get('start_date')
        stop_date = attrs.get('stop_date')

        if is_active and stop_date is not None:
            raise serializers.ValidationError("stop_date must be None if is_active is True.")

        if start_date and stop_date:
            if stop_date < start_date:
                raise serializers.ValidationError("stop_date must be after start_date.")

        return attrs

 

# Serializer for Matiere
class MatiereSerializer(TranslationMixin, serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    class Meta:
        model = Matiere
        fields = ['id', 'matiere', 'description']

    def get_description(self, obj):
        return self._t('matiere', obj.id, default="")


# Serializer for ScoreRule
class ScoreRuleSerializer(TranslationMixin, serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    class Meta:
        model = ScoreRule
        fields = ['id', 'description']

    def get_description(self, obj):
        return self._t('scorerule', obj.id, default="")


# Serializer for ScoreRulePoint
class ScoreRulePointSerializer(TranslationMixin, serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    class Meta:
        model = ScoreRulePoint
        fields = ['id', 'scorerule', 'scorelabel', 'score', 'description']

    def get_description(self, obj):
        return self._t('scorerulepoint', obj.id, default="")


# Serializer for Catalogue
class CatalogueSerializer(TranslationMixin, serializers.ModelSerializer):
    niveau_id = serializers.PrimaryKeyRelatedField(
        queryset=Niveau.objects.all(),
        source='niveau'  # Allows the use of niveau_id while creating
    )
    etape_id = serializers.PrimaryKeyRelatedField(
        queryset=Etape.objects.all(),
        source='etape'  # Allows the use of etape_id while creating
    )
    annee_id = serializers.PrimaryKeyRelatedField(
        queryset=Annee.objects.all(),
        source='annee'  # Allows the use of annee_id while creating
    )
    matiere_id = serializers.PrimaryKeyRelatedField(
        queryset=Matiere.objects.all(),
        source='matiere'  # Allows the use of matiere_id while creating
    )

    # Include the nested serializers for read operations
    niveau = NiveauSerializer(read_only=True)
    etape = EtapeSerializer(read_only=True)
    annee = AnneeSerializer(read_only=True)
    matiere = MatiereSerializer(read_only=True)

    description = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Catalogue
        fields = ['id', 'niveau_id', 'etape_id', 'annee_id', 'matiere_id',
                  'description', 'niveau', 'etape', 'annee', 'matiere']

    def get_description(self, obj):
        return self._t('catalogue', obj.id, default="")

    def create(self, validated_data):
        return super().create(validated_data)
    
 
class CatalogueDescriptionSerializer(TranslationMixin, serializers.ModelSerializer):
    description = serializers.SerializerMethodField()

    class Meta:
        model = Catalogue
        fields = ['id', 'description']

    def get_description(self, obj):
        return self._t('catalogue', obj.id, default="")


# Serializer for Item
class ItemSerializer(TranslationMixin, serializers.ModelSerializer):
    # Read-only, human label from Translation(key="temps", ref_id=item.temps)
    temps = serializers.SerializerMethodField(read_only=True)

    # Write-only, the integer ID you persist in the model
    temps_id = serializers.IntegerField(source='temps', write_only=True, required=False)

    description = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Item
        fields = [
            'id',
            'temps',        # string label (read)
            'temps_id',     # integer id (write)
            'description',
            'observation',
            'scorerule',
            'max_score',
            'itempos',
            'link',
        ]

    def get_description(self, obj):
        return self._t('item', obj.id, default="")

    def get_temps(self, obj):
        # fallback shows "T{n}" if missing
        return self._t('temps', obj.temps, default=f"T{obj.temps}")


class GroupageDataSerializer(TranslationMixin, serializers.ModelSerializer):
    groupage_icon_id = serializers.IntegerField(write_only=False, required=False)
    items = ItemSerializer(many=True, read_only=True, source='item_set')
    # catalogue_id = serializers.IntegerField(source='catalogue_id', read_only=True)
    catalogue_id = serializers.PrimaryKeyRelatedField(source='catalogue', read_only=True)
    # accept writes with the same field names
    desc_groupage = serializers.CharField(write_only=True, required=False, allow_blank=True)
    label_groupage = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = GroupageData
        fields = [
            'id', 'catalogue', 'groupage_icon_id', 'catalogue_id',
            'position', 'desc_groupage', 'label_groupage',
            'link', 'max_point', 'seuil1', 'seuil2', 'max_item', 'items'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # inject translated values for reads
        data['desc_groupage']  = self._t('groupagedata', instance.id, default="")
        data['label_groupage'] = self._t('groupagedata.label', instance.id, default="")
        return data

    def create(self, validated_data):
        desc = validated_data.pop('desc_groupage', None)
        label = validated_data.pop('label_groupage', None)

        groupage_icon_id = validated_data.pop('groupage_icon_id', None)
        groupage_icon = MyImage.objects.get(id=groupage_icon_id) if groupage_icon_id else None

        gd = GroupageData.objects.create(groupage_icon=groupage_icon, **validated_data)

        # store translations (language = active locale)
        if desc:
            self._set_t('groupagedata', gd.id, desc)
        if label:
            self._set_t('groupagedata.label', gd.id, label)

        return gd

    def update(self, instance, validated_data):
        desc = validated_data.pop('desc_groupage', None)
        label = validated_data.pop('label_groupage', None)

        groupage_icon_id = validated_data.pop('groupage_icon_id', None)
        instance.groupage_icon = (
            MyImage.objects.get(id=groupage_icon_id) if groupage_icon_id else instance.groupage_icon
        )

        for attr in ['catalogue', 'position', 'link', 'max_point', 'seuil1', 'seuil2', 'max_item']:
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])

        instance.save()

        if desc is not None:
            self._set_t('groupagedata', instance.id, desc)
        if label is not None:
            self._set_t('groupagedata.label', instance.id, label)

        return instance



    
class PDFLayoutSerializer(serializers.ModelSerializer):
    header_icon_base64 = serializers.SerializerMethodField()

    class Meta:
        model = PDFLayout
        fields = ['id', 'header_icon', 'header_icon_base64', 'schule_name', 'header_message', 'footer_message1', 'footer_message2']
        extra_kwargs = {
            'header_icon': {'read_only': True},  # Make header_icon read-only
        }

    def get_header_icon_base64(self, obj):
        if obj.header_icon:
            with open(obj.header_icon.path, 'rb') as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                return f'data:image/png;base64,{encoded_string}'
        return None
 

  

 

class MyImageSerializer(serializers.ModelSerializer):
    icon_base64 = serializers.SerializerMethodField()

    class Meta:
        model = MyImage
        fields = ['id', 'icon', 'icon_base64']
        # Remove read_only from icon field to allow image updates
        # extra_kwargs = {
        #    'icon': {'read_only': True},
        # }

    def get_icon_base64(self, obj):
        if obj.icon and os.path.exists(obj.icon.path):  # Ensure file exists
            with open(obj.icon.path, 'rb') as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                return f'data:image/png;base64,{encoded_string}'
        return None


 


class ResultatDetailSerializer(serializers.ModelSerializer):
    item_id = serializers.IntegerField(write_only=True, required=False)  # Only for update (foreign key)

    class Meta:
        model = ResultatDetail
        fields = ['id', 'item','item_id', 'score', 'scorelabel', 'observation']  
        extra_kwargs = {
            'id': {'read_only': False},  # Allow ID to be included for updates
            'item': {'read_only': True},  # Prevent updating the full item once created
            'score': {'default': -1},
            'scorelabel': {'default': '?'},
            'observation': {'default': ''},
        }
        depth = 1  # Automatically include related Item details

    def create(self, validated_data):
        # 'item' is expected to be an object for creation
        if 'item' not in validated_data:
            raise serializers.ValidationError({"item": "This field is required."})
        return ResultatDetail.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # Handle the `item_id` only if it's provided, for PATCH operations
        # Update other fields if provided
        instance.score = validated_data.get('score', instance.score)
        instance.scorelabel = validated_data.get('scorelabel', instance.scorelabel)
        instance.observation = validated_data.get('observation', instance.observation)
        instance.save()
        return instance



class ResultatSerializer(serializers.ModelSerializer):
    resultat_details = ResultatDetailSerializer(many=True)
    groupage = GroupageDataSerializer()  

    class Meta:
        model = Resultat
        fields = ['id', 'groupage', 'score', 'seuil1_percent', 'seuil2_percent', 'seuil3_percent', 'resultat_details']
        extra_kwargs = {
            'id': {'read_only': False},  # Allow ID to be included for updates
            'score': {'default': -1},  # Default score on creation
            'seuil1_percent': {'default': -1},  # Default value on creation, to be updated later
            'seuil2_percent': {'default': -1},  # Default value on creation, to be updated later
            'seuil3_percent': {'default': -1},  # Default value on creation, to be updated later
        }
        depth = 1  # To automatically include related Item details

    def create(self, validated_data):
        resultat_details_data = validated_data.pop('resultat_details', [])
        resultat = Resultat.objects.create(**validated_data)

        for detail_data in resultat_details_data:
            ResultatDetail.objects.create(resultat=resultat, **detail_data)

        return resultat


    def update(self, instance, validated_data):
        instance.groupage = validated_data.get('groupage', instance.groupage)
        instance.save()  # Save the updated instance

        # Update ResultatDetails without expecting them in the payload
        resultat_details_data = validated_data.pop('resultat_details', [])
        existing_details_ids = {detail.id for detail in instance.resultat_details.all()}

        for detail_data in resultat_details_data:
            detail_id = detail_data.get('id')
            if detail_id in existing_details_ids:
                # Update existing ResultatDetail
                resultat_detail = ResultatDetail.objects.get(id=detail_id)
                resultat_detail.score = detail_data.get('score', resultat_detail.score)
                resultat_detail.scorelabel = detail_data.get('scorelabel', resultat_detail.scorelabel)
                resultat_detail.observation = detail_data.get('observation', resultat_detail.observation)
                resultat_detail.save()
            else:
                # Create new ResultatDetail if no ID is provided
                ResultatDetail.objects.create(resultat=instance, **detail_data)

        # After updating all details, recalculate the score and thresholds
        self.update_score_and_thresholds(instance)

        return instance

    def update_score_and_thresholds(self, resultat):
        """Calculate and update the score and thresholds based on ResultatDetails and GroupageData."""

        # Check if any ResultatDetail has scorelabel = "?"
        if resultat.resultat_details.filter(scorelabel="?").exists():
            # Set default values when at least one test is not performed
            resultat.score = -1
            resultat.seuil1_percent = -1
            resultat.seuil2_percent = -1
            resultat.seuil3_percent = -1
            resultat.save()  # Save the updated Resultat instance
            return  # Exit the function early
        

        # Calculate total score from all associated ResultatDetails
        total_score = sum(detail.score for detail in resultat.resultat_details.all())
        
        # Update the score field
        resultat.score = total_score
        
        # Retrieve the associated GroupageData
        groupage_data = GroupageData.objects.get(id=resultat.groupage.id)

        # Get threshold values
        seuil1 = groupage_data.seuil1
        seuil2 = groupage_data.seuil2
        max_point = groupage_data.max_point

        # Calculate threshold percentages
        if total_score <= seuil1:
            resultat.seuil1_percent = (total_score / seuil1) * 100 if seuil1 > 0 else 0
            resultat.seuil2_percent = 0  # No score above seuil1, so set to 0
            resultat.seuil3_percent = 0  # No score above seuil2, so set to 0
        elif total_score <= seuil2:
            resultat.seuil1_percent = 100  # Achieved threshold 1
            resultat.seuil2_percent = ((total_score - seuil1) / (seuil2 - seuil1)) * 100 if seuil2 > seuil1 else 0
            resultat.seuil3_percent = 0  # No score above seuil2, so set to 0
        else:  # total_score > seuil2
            resultat.seuil1_percent = 100  # Achieved threshold 1
            resultat.seuil2_percent = 100  # Achieved threshold 2
            resultat.seuil3_percent = ((total_score - seuil2) / (max_point - seuil2)) * 100 if max_point > seuil2 else 0

        # Save the updated Resultat instance
        resultat.save()


class ReportCatalogueSerializer(serializers.ModelSerializer):
    resultats = ResultatSerializer(many=True)
    
    # Use CatalogueDescriptionSerializer for GET requests (nested read)
    catalogue = CatalogueDescriptionSerializer(read_only=True) 

    class Meta:
        model = ReportCatalogue
        fields = ['id', 'catalogue', 'resultats']
        extra_kwargs = {
            'id': {'read_only': False},  # Allow ID to be included for updates
        }
        depth = 0  # No automatic depth, we handle it manually

    def create(self, validated_data):
        resultats_data = validated_data.pop('resultats', [])
        catalogue_id = validated_data.pop('catalogue_id')
        report_catalogue = ReportCatalogue.objects.create(catalogue_id=catalogue_id, **validated_data)

        for resultat_data in resultats_data:
            Resultat.objects.create(report_catalogue=report_catalogue, **resultat_data)

        return report_catalogue
 
    def update(self, instance, validated_data):
        # No need to save the `ReportCatalogue` instance as we are not updating it
        # Instead, focus on updating the nested `Resultats` and their `ResultatDetails`
        
        resultats_data = validated_data.pop('resultats', [])
        existing_resultats = {resultat.id: resultat for resultat in instance.resultats.all()}  # Preload existing Resultats

        for resultat_data in resultats_data:
            resultat_id = resultat_data.get('id')
            if resultat_id in existing_resultats:
                # Update existing Resultat
                resultat = existing_resultats[resultat_id]
                for attr, value in resultat_data.items():
                    if attr == "resultat_details":  # Handle reverse relation for ResultatDetails
                        # Use the ResultatSerializer to update the nested ResultatDetails
                        detail_serializer = ResultatSerializer(resultat, data=resultat_data, partial=True,context=self.context)
                        if detail_serializer.is_valid():
                            detail_serializer.save()
                        else:
                            raise serializers.ValidationError(detail_serializer.errors)
                    else:
                        setattr(resultat, attr, value)
                resultat.save()  # Save the updated Resultat
            else:
                # Create new Resultat if no ID is provided
                Resultat.objects.create(report_catalogue=instance, **resultat_data)

        return instance


class FullReportSerializer(serializers.ModelSerializer):
    catalogue_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)  # For creation
    report_catalogues = ReportCatalogueSerializer(many=True, read_only=True)  # For retrieving data
    report_catalogues_data = ReportCatalogueSerializer(many=True, write_only=True, required=False)  # For updates
    eleve = serializers.PrimaryKeyRelatedField(queryset=Eleve.objects.all())
    professeur = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all())
    pdflayout = serializers.PrimaryKeyRelatedField(queryset=PDFLayout.objects.all())

    class Meta:
        model = Report
        fields = ['id', 'eleve', 'professeur', 'pdflayout', 'created_at', 'updated_at', 'catalogue_ids', 'report_catalogues', 'report_catalogues_data']
        read_only_fields = ['created_at', 'updated_at', 'report_catalogues']
        depth = 1  # To automatically include related Item details

    def create(self, validated_data):
        catalogue_ids = validated_data.pop('catalogue_ids', [])
        report = Report.objects.create(**validated_data)

        for catalogue_id in catalogue_ids:
            try:
                catalogue = Catalogue.objects.get(id=catalogue_id)
                report_catalogue = ReportCatalogue.objects.create(report=report, catalogue=catalogue)

                # Create Resultats for each ReportCatalogue
                groupages = GroupageData.objects.filter(catalogue=catalogue).order_by('position')
                for groupage in groupages:
                    resultat = Resultat.objects.create(
                        report_catalogue=report_catalogue,
                        groupage=groupage,
                        score=-1,
                        seuil1_percent=-1,
                        seuil2_percent=-1,
                        seuil3_percent=-1
                    )

                    # Create ResultatDetails for each Resultat
                    items = Item.objects.filter(groupagedata=groupage).order_by('itempos')
                    for item in items:
                        ResultatDetail.objects.create(
                            resultat=resultat,
                            item=item,
                            score=-1,
                            scorelabel='?',
                            observation=''
                        )

            except Catalogue.DoesNotExist:
                raise serializers.ValidationError(f"Catalogue with id {catalogue_id} does not exist.")

        return report

    def update(self, instance, validated_data):
        # Handle the case for updating the report, but avoid updating ReportCatalogue itself
        report_catalogues_data = validated_data.pop('report_catalogues_data', [])

        # Update standard fields for the Report
        instance.eleve = validated_data.get('eleve', instance.eleve)
        instance.professeur = validated_data.get('professeur', instance.professeur)
        instance.pdflayout = validated_data.get('pdflayout', instance.pdflayout)
        instance.save()

        # Iterate through provided ReportCatalogues data to update the nested Resultats, but avoid updating the ReportCatalogue
        for reportcatalogue_data in report_catalogues_data:
            reportcatalogue_id = reportcatalogue_data.get('id')  # Get the ReportCatalogue ID

            if reportcatalogue_id:  # Ensure we have a catalogue_id in the data
                try:
                    # Retrieve the existing ReportCatalogue instance related to the current report
                    report_catalogue = ReportCatalogue.objects.get(id=reportcatalogue_id, report=instance)

                    # Now handle nested Resultats for this ReportCatalogue
                    resultats_data = reportcatalogue_data.get('resultats', [])
                    for resultat_data in resultats_data:
                        resultat_id = resultat_data.get('id')  # Get the Resultat ID

                        if resultat_id:  # Ensure we have a Resultat ID
                            try:
                                # Retrieve the existing Resultat instance related to this ReportCatalogue
                                resultat = Resultat.objects.get(id=resultat_id, report_catalogue=report_catalogue)

                                # Update the Resultat instance
                                resultat_serializer = ResultatSerializer(resultat, data=resultat_data, partial=True,context=self.context)
                                if resultat_serializer.is_valid(raise_exception=True):
                                    resultat_serializer.save()

                            except Resultat.DoesNotExist:
                                raise serializers.ValidationError(f"Resultat with id {resultat_id} does not exist.")
                
                except ReportCatalogue.DoesNotExist:
                    raise serializers.ValidationError(f"ReportCatalogue with id {reportcatalogue_id} does not exist.")
        
        return instance

    def validate(self, attrs):
        # Custom validation to ensure required fields for updates
        if 'report_catalogues_data' in attrs and not attrs['report_catalogues_data']:
            raise serializers.ValidationError({"report_catalogues_data": "This field is required for updates."})

        # Ensure each catalogue_data has an id
        report_catalogues_data = attrs.get('report_catalogues_data', [])
        for report_catalogue_data in report_catalogues_data:
            if 'id' not in report_catalogue_data:
                raise serializers.ValidationError({"id": "This field is required for each report_catalogue_data."})

        return super().validate(attrs)

###################################################
class ShortGroupageDataSerializer(TranslationMixin, serializers.ModelSerializer):
    desc_groupage  = serializers.SerializerMethodField()
    label_groupage = serializers.SerializerMethodField()

    class Meta:
        model = GroupageData
        fields = ['id', 'desc_groupage', 'label_groupage', 'position', 'max_point', 'seuil1', 'seuil2']
        read_only_fields = fields

    def get_desc_groupage(self, obj):
        return self._t('groupagedata', obj.id, default="")

    def get_label_groupage(self, obj):
        return self._t('groupagedata.label', obj.id, default="")



class ShortResultatSerializer(serializers.ModelSerializer):
    groupage = ShortGroupageDataSerializer(read_only=True)  # Groupage data is read-only and nested

    class Meta:
        model = Resultat
        fields = ['id', 'score', 'seuil1_percent', 'seuil2_percent', 'seuil3_percent', 'groupage']
        read_only_fields = fields  # Make all fields read-only

class ShortReportCatalogueSerializer(serializers.ModelSerializer):
    catalogue = serializers.StringRelatedField(read_only=True)  # Assumes __str__() is implemented in Catalogue
    resultats = ShortResultatSerializer(many=True, read_only=True)  # Include related resultats, all read-only
    # Use CatalogueDescriptionSerializer for GET requests (nested read)
    #catalogue = CatalogueDescriptionSerializer(read_only=True)

    class Meta:
        model = ReportCatalogue
        fields = ['id', 'catalogue', 'resultats']
        read_only_fields = fields  # Make all fields read-only
  

class ShortReportSerializer(serializers.ModelSerializer):
    # eleve = serializers.StringRelatedField(read_only=True)  # Returns string representation of eleve
    eleve = serializers.SerializerMethodField(read_only=True)  # Returns string representation of eleve
    professeur = serializers.SerializerMethodField(read_only=True)  # Custom method for professeur
    report_catalogues = ShortReportCatalogueSerializer(many=True, read_only=True)  # Nested serializer for report catalogues
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Report
        fields = ['id', 'eleve', 'professeur', 'report_catalogues', 'created_at', 'updated_at']

    def get_professeur(self, obj):
        # Access professeur directly and return relevant data
        if obj.professeur:  # Assuming professeur is a User instance
            return {
                'first_name': obj.professeur.first_name,  # Directly access first_name
                'last_name': obj.professeur.last_name      # Directly access last_name
            }
        return None  # Return None if no professeur exists


    def get_eleve(self, obj):
        if obj.eleve:
            return {
                'id': obj.eleve.id,
                'prenom': obj.eleve.prenom,
                'nom': obj.eleve.nom,
                'niveau': obj.eleve.niveau.niveau  # Directly accessing the niveau name
            }
        return None

  