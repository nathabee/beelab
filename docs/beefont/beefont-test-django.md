

# DJANGO TEST



## initialise alias
(start . ./scripts/alias.sh dev)
beelab-dev

## reset django database migration and fixture init
### make migration and seed 
dcdjmm
dcdjseed_beefont

### make migration and reseed all apps
dcdjmm
dcseed_all
oder :
dcdjreseed --hard user beefont pomolobee competence




### to force 
 dcdjango python manage.py shell << 'PY'
from django.db.migrations.recorder import MigrationRecorder

qs = MigrationRecorder.Migration.objects.filter(app='beefontcore')
print("Existing BeeFontCore migrations in DB:", list(qs.values_list('name', flat=True)))
qs.delete()
print("Deleted BeeFontCore migration records.")
PY

dcdjango python manage.py migrate beefontcore 0001_initial --fake-initial



## list of all alias
beefonthelp

  beefont_templates
  beefont_template_image CODE [mode] [outfile.png]
  beefont_languages
  beefont_language_alphabet CODE
  beefont_jobs
  beefont_job_create NAME [BASE_FAMILY]
  beefont_job SID
  beefont_job_delete SID
  beefont_rmjobs     # delete all jobs for current user
  beefont_job_pages SID
  beefont_job_page_create SID TEMPLATE_CODE PAGE_INDEX "LETTERS"
  beefont_page SID PAGE_ID
  beefont_page_delete SID PAGE_ID
  beefont_page_upload_scan SID PAGE_ID scan.png
  beefont_page_analyse SID PAGE_ID
  beefont_page_retry_analysis SID PAGE_ID
  beefont_glyphs SID [LETTER]
  beefont_glyph SID LETTER
  beefont_glyph_select SID LETTER GLYPH_ID
  beefont_glyph_select SID LETTER VARIANT_INDEX --by-variant
  beefont_build SID LANGUAGE
  beefont_download_ttf SID LANGUAGE [outfile.ttf]
  beefont_download_zip SID [outfile.zip]
  beefont_languages_status SID
  beefont_language_status SID LANGUAGE
  beefont_demo_scenarioA [NAME] [LANG] [TEMPLATE_CODE] ["ALPHABET"]
  demi_scenarioA ...   # alias auf beefont_demo_scenarioA
  beefont_demo_scenarioB SID [DE_LANG] [TEMPLATE_CODE]


## integration test with REST API

  beefont_demo_scenarioA MyBeeFont DE 6x5 
  
  demi_scenarioA ...   # alias auf beefont_demo_scenarioA
  beefont_demo_scenarioB SID [DE_LANG] [TEMPLATE_CODE]

  example
  beelab-dev
     beefont_demo_scenarioA myfont de
     if job 85fa2118b057450e86602801047f0f14 is created :
   beefont_demo_scenarioB 85fa2118b057450e86602801047f0f14 fr
   beefont_demo_scenarioC 85fa2118b057450e86602801047f0f14 fr  A4_6x5 ABC
