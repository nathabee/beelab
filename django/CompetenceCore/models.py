# CompetenceCore/models.py
from django.db import models
from django.conf import settings

# ---------- shared translation helper ----------
def get_translation_text(key: str, ref_id: int, language: str, default: str = "") -> str:
    """
    Fetch translated text for (key, ref_id, language).
    Fallback order: requested language -> 'en' -> any -> default.
    """
    try:
        from CompetenceCore.models import Translation  # local import to avoid circular refs in migrations
        qs = Translation.objects.filter(key=key, ref_id=ref_id)
        # requested language
        t = qs.filter(language=language).values_list('text', flat=True).first()
        if t:
            return t
        # english
        t = qs.filter(language='en').values_list('text', flat=True).first()
        if t:
            return t
        # any available
        t = qs.values_list('text', flat=True).first()
        return t if t else default
    except Exception:
        return default


# ---------- Translation ----------
class Translation(models.Model):
    key = models.CharField(max_length=64, db_index=True)          # e.g. 'niveau', 'etape', 'catalogue', ...
    ref_id = models.PositiveIntegerField(db_index=True, null=True, blank=True)          # ID of the referenced object
    language = models.CharField(max_length=10, db_index=True)      
    text = models.TextField()

    class Meta:
        unique_together = ('key', 'ref_id', 'language')
        indexes = [
            models.Index(fields=['key', 'ref_id'], name='trans_key_ref_idx'),
            models.Index(fields=['language'], name='trans_lang_idx'),
        ]

    def __str__(self):
        return f'{self.key}#{self.ref_id} [{self.language}]: {self.text[:40]}'


# ---------- Niveau (already externalized) ----------
class Niveau(models.Model):
    niveau = models.CharField(max_length=10)

    class Meta:
        indexes = [models.Index(fields=['niveau'], name='niveau_idx')]

    def __str__(self):
        # name translation (key='niveau') handled in fixtures; keep simple
        return f"{self.niveau}"

    @property
    def description(self):
        return self.get_description('en')

# ---------- Etape ----------
class Etape(models.Model):
    etape = models.CharField(max_length=10)
    # description -> externalized to Translation with key='etape'

    class Meta:
        indexes = [models.Index(fields=['etape'], name='etape_idx')]

    # optional convenience accessor
    def get_description(self, language='en'):
        return get_translation_text('etape', self.id, language, default="")

    def __str__(self):
        return f"{self.etape}"

    @property
    def description(self):
        return self.get_description('en')
    
# ---------- Annee ----------
class Annee(models.Model):
    is_active = models.BooleanField(default=False)
    start_date = models.DateField(blank=True, null=True)
    stop_date = models.DateField(blank=True, null=True)
    # description -> externalized to Translation with key='annee'

    @property
    def description(self):
        return self.get_description('en')
    
    class Meta:
        indexes = [
            models.Index(fields=['is_active'], name='annee_active_idx'),
            models.Index(fields=['start_date'], name='annee_start_date_idx'),
            models.Index(fields=['stop_date'], name='annee_stop_date_idx'),
        ]

    def save(self, *args, **kwargs):
        from django.utils import timezone
        if not self.start_date:
            self.start_date = timezone.now().date()
        super().save(*args, **kwargs)

    def get_description(self, language='en'):
        return get_translation_text('annee', self.id, language, default="")

    def __str__(self):
        year = self.start_date.year if self.start_date else "?"
        return f"{year} - {self.get_description()}"


# ---------- Matiere ----------
class Matiere(models.Model):
    matiere = models.CharField(max_length=1)
    # description -> externalized to Translation with key='matiere'

    @property
    def description(self):
        return self.get_description('en')
    
    class Meta:
        indexes = [models.Index(fields=['matiere'], name='matiere_idx')]

    def get_description(self, language='en'):
        return get_translation_text('matiere', self.id, language, default="")

    def __str__(self):
        return f"{self.matiere} - {self.get_description()}"


# ---------- ScoreRule ----------
class ScoreRule(models.Model):
    # description -> externalized to Translation with key='scorerule'

    @property
    def description(self):
        return self.get_description('en')
    
    class Meta:
        indexes = []  # old description index removed

    def get_description(self, language='en'):
        return get_translation_text('scorerule', self.id, language, default="")

    def __str__(self):
        return f"Rule:{self.id} - {self.get_description()}"


# ---------- ScoreRulePoint ----------
class ScoreRulePoint(models.Model):
    scorerule = models.ForeignKey('ScoreRule', related_name='points', on_delete=models.CASCADE, default=1)
    scorelabel = models.CharField(max_length=20)
    score = models.IntegerField()
    # description -> externalized to Translation with key='scorerulepoint'

    @property
    def description(self):
        return self.get_description('en')
    
    class Meta:
        indexes = [models.Index(fields=['scorerule'], name='scorerulepoint_scorerule_idx')]

    def get_description(self, language='en'):
        return get_translation_text('scorerulepoint', self.id, language, default="")

    def __str__(self):
        return f"Rule:{self.scorerule.id} - {self.scorelabel} - {self.score} - {self.get_description()}"

 
# Table: Eleve (Student)
class Eleve(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    niveau = models.ForeignKey('Niveau', on_delete=models.CASCADE, default=1)
    datenaissance = models.DateField(null=True, blank=True)
    is_demo = models.BooleanField(default=False, db_index=True)
    professeurs = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='eleves', blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['niveau'], name='eleve_niveau_idx'),
        ]

    def __str__(self):
        return f"Eleve:{self.id} - {self.nom} {self.prenom} - {self.niveau}"


# ---------- Catalogue ----------
class Catalogue(models.Model):
    niveau = models.ForeignKey('Niveau', on_delete=models.CASCADE, default=1)
    etape = models.ForeignKey('Etape', on_delete=models.CASCADE, default=1)
    annee = models.ForeignKey('Annee', on_delete=models.CASCADE, default=1)
    matiere = models.ForeignKey('Matiere', on_delete=models.CASCADE, default=1)
    # description -> externalized to Translation with key='catalogue'

    @property
    def description(self):
        return self.get_description('en')
    is_demo = models.BooleanField(default=False, db_index=True)
    professeurs = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='catalogues', blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['niveau'], name='catalogue_niveau_idx'),
            models.Index(fields=['etape'], name='catalogue_etape_idx'),
            models.Index(fields=['annee'], name='catalogue_annee_idx'),
            models.Index(fields=['matiere'], name='catalogue_matiere_idx'),
        ]

    def get_description(self, language='en'):
        return get_translation_text('catalogue', self.id, language, default="")

    def __str__(self):
        return f"Catalogue for {self.get_description()}"


# ---------- Item ----------
class Item(models.Model):
    groupagedata = models.ForeignKey('GroupageData', on_delete=models.CASCADE)
    temps = models.PositiveIntegerField() 
    # description -> externalized to Translation with key='item'

    @property
    def description(self):
        return self.get_description('en')
    
    observation = models.TextField(blank=True, null=True)
    scorerule = models.ForeignKey('ScoreRule', on_delete=models.CASCADE, default=1)
    max_score = models.FloatField()
    itempos = models.IntegerField()
    link = models.CharField(max_length=500)

    class Meta:
        indexes = [
            models.Index(fields=['groupagedata'], name='item_groupagedata_idx'),
            models.Index(fields=['scorerule'], name='item_scorerule_idx'),
        ]

    def get_description(self, language='en'):
        return get_translation_text('item', self.id, language, default="")

    def get_temps_label(self, language='en'):  
        return get_translation_text('temps', self.temps, language, default=f"T{self.temps}")


    def __str__(self):
        return f"Test {self.groupagedata} - {self.temps} - {self.get_description()}"


# ---------- MyImage (unchanged) ----------
from PIL import Image
import os
from django.core.files import File

class MyImage(models.Model):
    icon = models.ImageField(upload_to='competence/icons/')

    def __str__(self):
        return f"Icone: {self.id}"

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                previous = MyImage.objects.get(pk=self.pk)
                if previous.icon and previous.icon.path and os.path.exists(previous.icon.path):
                    if previous.icon == self.icon:
                        super(MyImage, self).save(*args, **kwargs)
                        return
            except MyImage.DoesNotExist:
                pass

        if self.icon and not self.icon.name.startswith('resized_'):
            try:
                img = Image.open(self.icon)
                img.thumbnail((100, 100), Image.LANCZOS)
                from django.conf import settings
                resized_image_name = f"resized_{os.path.basename(self.icon.name)}"
                temp_file_path = os.path.join(settings.MEDIA_ROOT, 'competence/png/', resized_image_name)
                os.makedirs(os.path.dirname(temp_file_path), exist_ok=True)
                img.save(temp_file_path)
                with open(temp_file_path, 'rb') as f:
                    self.icon.save(resized_image_name, File(f), save=False)
                os.remove(temp_file_path)
            except Exception as e:
                print(f"Error processing image: {e}")
                pass

        super(MyImage, self).save(*args, **kwargs)


# ---------- GroupageData ----------
class GroupageData(models.Model):
    catalogue = models.ForeignKey('Catalogue', on_delete=models.CASCADE)
    groupage_icon = models.ForeignKey(MyImage, on_delete=models.SET_NULL, null=True, blank=True)
    position = models.IntegerField()
    # desc_groupage/label_groupage externalized to Translation with:
    #   key='groupagedata'        (the description)
    #   key='groupagedata.label'  (the label)
    link = models.CharField(max_length=500)
    max_point = models.IntegerField()
    seuil1 = models.IntegerField()
    seuil2 = models.IntegerField()
    max_item = models.IntegerField()

    @property
    def desc_groupage(self):
        return self.get_desc('en')

    @property
    def label_groupage(self):
        return self.get_label('en')
        
    class Meta:
        indexes = [models.Index(fields=['catalogue'], name='groupagedata_catalogue_idx')]

    def get_desc(self, language='en'):
        return get_translation_text('groupagedata', self.id, language, default="")

    def get_label(self, language='en'):
        return get_translation_text('groupagedata.label', self.id, language, default="")

    def __str__(self):
        return f"Groupage {self.get_desc()} - Position {self.position}"



# ---------- PDFLayout, Report, ReportCatalogue, Resultat, ResultatDetail (unchanged) ----------
class PDFLayout(models.Model):
    header_icon = models.ImageField(upload_to='competence/header_icons/')
    language = models.CharField(
        max_length=10,
        db_index=True,
        default='en',                
        # choices=[('en','English'), ('fr','Français'), ('bz','Breton'), ('de','Deutsch')],  # optional
    )
    schule_name = models.TextField(blank=True, null=True)
    header_message = models.TextField(blank=True, null=True)
    footer_message1 = models.TextField(blank=True, null=True)
    footer_message2 = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"PDF Layout: {self.id}"

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                previous = PDFLayout.objects.get(pk=self.pk)
                if previous.header_icon == self.header_icon:
                    super(PDFLayout, self).save(*args, **kwargs)
                    return
            except PDFLayout.DoesNotExist:
                pass

        if self.header_icon and not self.header_icon.name.startswith('resized_'):
            img = Image.open(self.header_icon)
            img.thumbnail((100, 100), Image.LANCZOS)
            from django.conf import settings
            import os
            from django.core.files import File
            resized_image_name = f"resized_{os.path.basename(self.header_icon.name)}"
            temp_file_path = os.path.join(settings.MEDIA_ROOT, 'competence/header_icons', resized_image_name)
            img.save(temp_file_path)
            with open(temp_file_path, 'rb') as f:
                self.header_icon.save(f"{resized_image_name}", File(f), save=False)
            os.remove(temp_file_path)
        super(PDFLayout, self).save(*args, **kwargs)


class Report(models.Model):
    eleve = models.ForeignKey('Eleve', on_delete=models.CASCADE, related_name='reports')
    professeur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    pdflayout = models.ForeignKey('PDFLayout', on_delete=models.CASCADE)

    class Meta:
        indexes = [
            models.Index(fields=['eleve'], name='report_eleve_idx'),
            models.Index(fields=['professeur'], name='report_professeur_idx'),
        ]

    def __str__(self):
        return f"Report for {self.eleve} - Created by {self.professeur}"


class ReportCatalogue(models.Model):
    report = models.ForeignKey('Report', on_delete=models.CASCADE, related_name='report_catalogues')
    catalogue = models.ForeignKey('Catalogue', on_delete=models.CASCADE)

    class Meta:
        indexes = [
            models.Index(fields=['report'], name='reportcatalogue_report_idx'),
            models.Index(fields=['catalogue'], name='reportcatalogue_catalogue_idx'),
        ]

    def __str__(self):
        return f"Report Catalogue for {self.catalogue}"


class Resultat(models.Model):
    report_catalogue = models.ForeignKey('ReportCatalogue', on_delete=models.CASCADE, related_name='resultats')
    groupage = models.ForeignKey('GroupageData', on_delete=models.CASCADE)
    score = models.FloatField()
    seuil1_percent = models.FloatField(default=0.0)
    seuil2_percent = models.FloatField(default=0.0)
    seuil3_percent = models.FloatField(default=0.0)

    class Meta:
        indexes = [
            models.Index(fields=['report_catalogue'], name='resultat_report_catalogue_idx'),
            models.Index(fields=['groupage'], name='resultat_groupage_idx'),
        ]

    def __str__(self):
        return f"Resultat for {self.report_catalogue}"


class ResultatDetail(models.Model):
    resultat = models.ForeignKey('Resultat', on_delete=models.CASCADE, related_name='resultat_details')
    item = models.ForeignKey('Item', on_delete=models.CASCADE)
    score = models.FloatField()
    scorelabel = models.CharField(max_length=50, blank=True, null=True)
    observation = models.TextField(blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['resultat'], name='resultatdetail_resultat_idx'),
            models.Index(fields=['item'], name='resultatdetail_item_idx'),
        ]

    def __str__(self):
        return f"Resultat Detail for {self.resultat}"