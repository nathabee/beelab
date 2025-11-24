# CompetenceCore/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import (
    Niveau, Etape, Annee, Matiere, ScoreRule, ScoreRulePoint, Eleve, Catalogue,
    GroupageData, Item, PDFLayout, Report, ReportCatalogue, Resultat, ResultatDetail,
    MyImage, Translation
)

from .forms import ImagePreviewWidget, GroupageDataForm
from django.db.models import Q

# ---------- Generic read-only ID mixin ----------
class ReadonlyIDMixin:
    readonly_fields = ('id',)

    def get_readonly_fields(self, request, obj=None):
        # ensure 'id' stays read-only even if subclasses override
        base = super().get_readonly_fields(request, obj)
        return tuple(sorted(set(base + ('id',))))


# ---------- Translation admin ----------
class TranslationAwareAdmin:
    @staticmethod
    def _lang():
        try:
            return get_language() or 'en'
        except Exception:
            return 'en'
        
class KeyPrefixFilter(admin.SimpleListFilter):
    title = 'Key Prefix (First 3 Letters)'
    parameter_name = 'key_prefix'

    def lookups(self, request, model_admin):
        prefixes = set(Translation.objects.values_list('key', flat=True))
        prefixes = {k[:3] for k in prefixes}
        return [(p, p) for p in sorted(prefixes)]

    def queryset(self, request, qs):
        if self.value():
            return qs.filter(key__startswith=self.value())
        return qs

@admin.register(Translation)
class TranslationAdmin(admin.ModelAdmin):
    list_display = ('id','key', 'ref_id', 'language', 'text')  # <- use text
    search_fields = ('key', 'language', 'text')
    list_filter = (KeyPrefixFilter, 'language')

 

# ---------- Helpers for translation-aware search in admins ----------

def _ids_matching_translation(key, term):
    return list(
        Translation.objects.filter(key=key, text__icontains=term)
        .values_list('ref_id', flat=True)
    )

# ---------- Core admins ----------
@admin.register(Niveau)
class NiveauAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id','niveau', 'description_i18n')
    list_filter = ('niveau',)
    search_fields = ('niveau',)

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"


@admin.register(Etape)
class EtapeAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id','etape', 'description_i18n')
    list_filter = ('etape',)
    search_fields = ('etape',)

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"


@admin.register(Annee)
class AnneeAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id','is_active', 'start_date', 'stop_date', 'description_i18n')
    list_filter = ('is_active', 'start_date', 'stop_date')

    def description_i18n(self, obj):
        # falls back (requested -> 'en' -> any) inside get_translation_text()
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"


@admin.register(Matiere)
class MatiereAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id','matiere', 'description_i18n')
    search_fields = ('matiere',)

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"


@admin.register(ScoreRule)
class ScoreRuleAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id', 'description_i18n')

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"


@admin.register(ScoreRulePoint)
class ScoreRulePointAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id','scorerule', 'scorelabel', 'score', 'description_i18n')
    list_filter = ('scorerule',)
    search_fields = ('scorelabel',)

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"


@admin.register(Catalogue)
class CatalogueAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id','niveau', 'etape', 'annee', 'matiere', 'description_i18n')
    list_filter = ('niveau', 'etape', 'annee', 'matiere')
    ordering = ('niveau', 'etape')
    search_fields = ()  # translation search via override below
    filter_horizontal = ('professeurs',)

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description" 

    def get_search_results(self, request, queryset, search_term):
        qs, use_distinct = super().get_search_results(request, queryset, search_term)
        if search_term:
            ids = _ids_matching_translation('catalogue', search_term)
            qs |= self.model.objects.filter(pk__in=ids)
            use_distinct = True
        return qs, use_distinct

@admin.register(GroupageData)
class GroupageDataAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    form = GroupageDataForm
    list_display = (
        'id','catalogue', 'display_groupage_icon', 'position',
        'desc_groupage_i18n', 'label_groupage_i18n',
        'link', 'max_point', 'seuil1', 'seuil2', 'max_item'
    )
    list_filter = ('catalogue',)
    search_fields = ()  # translation search via override below

    def desc_groupage_i18n(self, obj):
        return obj.get_desc(self._lang())
    desc_groupage_i18n.short_description = "Desc"

    def label_groupage_i18n(self, obj):
        return obj.get_label(self._lang())
    label_groupage_i18n.short_description = "Label"
 
    def get_search_results(self, request, queryset, search_term):
        qs, use_distinct = super().get_search_results(request, queryset, search_term)
        if search_term:
            ids_desc  = _ids_matching_translation('groupagedata', search_term)
            ids_label = _ids_matching_translation('groupagedata.label', search_term)
            qs |= queryset.filter(pk__in=set(ids_desc) | set(ids_label))
            use_distinct = True
        return qs, use_distinct

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields['groupage_icon'].widget.attrs.update({'onchange': 'updateImagePreview(this);'})
        return form

    def change_view(self, request, object_id, form_url='', extra_context=None):
        obj = self.get_object(request, object_id)
        current_image_url = obj.groupage_icon.icon.url if (obj and obj.groupage_icon and obj.groupage_icon.icon) else None
        return super().change_view(
            request, object_id, form_url,
            extra_context={'current_image_url': current_image_url, 'my_images': MyImage.objects.all()}
        )

    def display_groupage_icon(self, obj):
        if obj.groupage_icon_id:
            try:
                img = MyImage.objects.get(pk=obj.groupage_icon_id)
                if img.icon:
                    return format_html('<img src="{}" style="width:30px;height:30px;"/>', img.icon.url)
            except MyImage.DoesNotExist:
                return "Image not found"
        return "-"
    display_groupage_icon.short_description = "Groupage Icon"

@admin.register(MyImage)
class MyImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'display_icon']
    search_fields = ['id', 'icon']

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == 'icon':
            kwargs['widget'] = ImagePreviewWidget
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    def display_icon(self, obj):
        if obj.icon:
            return format_html('<img src="{}" style="max-height:200px; max-width:100%; object-fit:contain;" />', obj.icon.url)
        return "-"
    display_icon.short_description = "Icon"

@admin.register(Item)
class ItemAdmin(TranslationAwareAdmin, admin.ModelAdmin):
    list_display = ('id', 'description_i18n', 'temps', 'max_score', 'itempos')
    list_filter = ('groupagedata',)
    search_fields = ()  # translation search via override below

    def description_i18n(self, obj):
        return obj.get_description(self._lang())
    description_i18n.short_description = "Description"

    def get_search_results(self, request, queryset, search_term):
        qs, use_distinct = super().get_search_results(request, queryset, search_term)
        if search_term:
            ids = _ids_matching_translation('item', search_term)
            qs |= queryset.filter(pk__in=ids)
            use_distinct = True
        return qs, use_distinct

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id','eleve', 'professeur', 'created_at', 'updated_at')
    list_filter = ('professeur', 'created_at')
    search_fields = ('eleve__nom', 'eleve__prenom')
    inlines = [  # keep your inlines if you really need them; nesting often gets heavy
        # ReportCatalogueInline etc… (optional)
    ]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('eleve', 'professeur').prefetch_related(
            'report_catalogues__catalogue',
            'report_catalogues__resultats__resultat_details'
        )

@admin.register(ReportCatalogue)
class ReportCatalogueAdmin(admin.ModelAdmin):
    list_display = ('id','report', 'catalogue')
    list_filter = ('report',)
    search_fields = ('report__eleve__nom', 'report__eleve__prenom')  # removed catalogue__description (not a DB field)

@admin.register(Resultat)
class ResultatAdmin(admin.ModelAdmin):
    list_display = ('id','report_catalogue', 'groupage', 'score')
    list_filter = ('report_catalogue',)
    search_fields = ('report_catalogue__report__eleve__nom',)

@admin.register(ResultatDetail)
class ResultatDetailAdmin(admin.ModelAdmin):
    list_display = ('id','resultat', 'item', 'score')
    list_filter = ('resultat', 'item')
    search_fields = ('resultat__report_catalogue__report__eleve__nom',)

    def get_search_results(self, request, queryset, search_term):
        qs, use_distinct = super().get_search_results(request, queryset, search_term)
        if search_term:
            item_ids = _ids_matching_translation('item', search_term)
            qs |= queryset.filter(item_id__in=item_ids)
            use_distinct = True
        return qs, use_distinct

@admin.register(PDFLayout)
class PDFLayoutAdmin(admin.ModelAdmin):
    list_display = ('id', 'display_header_icon', 'language', 'schule_name', 'header_message', 'footer_message1', 'footer_message2')
    search_fields = ('language', 'schule_name', 'header_message', 'footer_message1', 'footer_message2')

    def display_header_icon(self, obj):
        if obj.header_icon:
            return format_html('<img src="{}" style="width:50px;height:50px;object-fit:contain;"/>', obj.header_icon.url)
        return "-"
    display_header_icon.short_description = "Header Icon"
