from django.apps import AppConfig

 

class CompetenceCoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "CompetenceCore"          # Python package path of the app
    label = "competencecore"         # optional; must be unique across project
    verbose_name = "Competence Core" # optional


    #def ready(self):
    #    import competence.signals  # Ensure the signals module is imported


