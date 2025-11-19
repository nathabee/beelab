from django.apps import AppConfig

class UserCoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "UserCore" #it must be the directory name 
    label = "usercore"  # mostly small cast
    verbose_name = "User Core"



 