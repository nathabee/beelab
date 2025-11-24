from django.db import models
# from django.contrib.auth.models import User

from django.conf import settings
import logging 

import os    

logger = logging.getLogger(__name__)


# Defines a Fruit Type
class Fruit(models.Model):
    short_name = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    yield_start_date = models.DateField()
    yield_end_date = models.DateField()
    yield_avg_kg = models.FloatField()  # Average yield per plant
    fruit_avg_kg = models.FloatField()  # Average weight of individual fruit

    def __str__(self):
        return self.name


# Defines a Farm
class Farm(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='farms')  # ✅ Renamed back to 'owner'

    is_demo_visible = models.BooleanField(default=False)
    def __str__(self):
        return f"Farm: {self.name}"
 
 

def svg_upload_path(instance, filename):
    # Always <short>_map.<ext> under pomolobee/fields/svg/
    ext = os.path.splitext(filename)[1].lower() or '.svg'
    return f"pomolobee/fields/svg/{instance.short_name}_map{ext}"

def background_image_upload_path(instance, filename):
    # Always <short>.<ext> under pomolobee/fields/background/
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ('.png', '.jpg', '.jpeg'):
        ext = '.jpeg'
    return f"pomolobee/fields/background/{instance.short_name}{ext}"
 
class Field(models.Model):
    farm = models.ForeignKey('Farm', on_delete=models.CASCADE, related_name='fields', default=1)
    short_name = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    orientation = models.CharField(max_length=50, blank=True, null=True)


    svg_map = models.FileField(
        upload_to=svg_upload_path,
        blank=True,
        null=True,
        default='pomolobee/fields/svg/default_map.svg',
        help_text="Upload SVG map of the field layout."
    )
    background_image = models.ImageField(
        upload_to=background_image_upload_path,
        blank=True,
        null=True,
        help_text="Upload background image for the field layout."
    )
#    svg_map = models.FileField(
#        upload_to=svg_upload_path,
#        blank=True,
#        null=True,
#        default='pomolobee/fields/svg/default_map.svg',
#        help_text="Upload SVG map of the field layout."
#    )#

 #   background_image = models.ImageField(  # ✅ ADD THIS
 #       upload_to=background_image_upload_path,
 #       blank=True,
 #       null=True,
 #       help_text="Upload background image for the field layout."
 #   )

    def save(self, *args, **kwargs):
        if not self.svg_map:
            self.svg_map.name = 'pomolobee/fields/svg/default_map.svg'
        super().save(*args, **kwargs)



# Defines a Row (a section in a field)
class Row(models.Model):
    short_name = models.CharField(max_length=50 )  #use to recognize a row in a field
    name = models.CharField(max_length=255)
    nb_plant = models.IntegerField()  # Number of plants in the row
    fruit = models.ForeignKey('Fruit', on_delete=models.CASCADE, related_name='rows')
    field = models.ForeignKey('Field', on_delete=models.CASCADE, related_name='rows')

    def __str__(self):
        return self.name
    
    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['field', 'short_name'], name='unique_row_shortname_per_field')
        ]


# Image storage for estimation analysis, it stores the exact location of the estimation in a field
class Image(models.Model):
 


    row = models.ForeignKey('Row', on_delete=models.CASCADE, related_name='images')
    date = models.DateField(null=True, blank=True)  # Date of capture (from app) (no time)
    upload_date =  models.DateField(null=True, blank=True)  # Date of upload in django (no time)
    image_file = models.ImageField(upload_to='images/')  # Stores uploaded image
    original_filename = models.CharField(max_length=255, blank=True, null=True) 
    xy_location = models.CharField(max_length=100, blank=True, null=True)
    user_fruit_plant  = models.FloatField(null=True, blank=True)  #fruit_plant number of fruit per plant estimated by user

    # ML result 
    processed = models.BooleanField(default=False)

    class ImageStatus(models.TextChoices):
        PROCESSING ="processing", "Processing"
        DONE = "done", "Done"
        FAILED = "failed", "Failed"
        #INVALID = "badjpg", "Invalid Image"
        DEFAULT = "default", "Invalid status"

    status = models.CharField(
        max_length=20,
        choices=ImageStatus.choices,
        default=ImageStatus.DEFAULT
    )
 
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Image {self.id} - {self.row.name if self.row else 'No Row'}"


# Estimation (Processed Data)
class Estimation(models.Model):
    image = models.ForeignKey(Image, on_delete=models.SET_NULL, null=True, related_name='estimations')
    row = models.ForeignKey('Row', on_delete=models.CASCADE, related_name='estimations')
    date = models.DateField()  # From user/app

    # ML or User result
    fruit_plant = models.FloatField(null=True, blank=True)  #fruit_plant number of fruit per plant
 
 
    timestamp = models.DateTimeField(auto_now_add=True) 
    plant_kg = models.FloatField()
    row_kg = models.FloatField()
    maturation_grade = models.FloatField(default=0)
    confidence_score = models.FloatField(null=True, blank=True)

    class EstimationSource(models.TextChoices):
        USER = "USR", "User manual estimation"
        IMAGE = "MLI", "Machine Learning (Image)"
        VIDEO = "MLV", "Machine Learning (Video)"

    source = models.CharField(
        max_length=3,
        choices=EstimationSource.choices,
        default=EstimationSource.IMAGE
    )

    def save(self, *args, **kwargs):
        try:
            if not self.row or not self.row.fruit:
                raise ValueError("Missing row or row.fruit when saving estimation")

            if self.fruit_plant is None:
                raise ValueError("fruit_plant is required for estimation")

            fruit_avg_kg = self.row.fruit.fruit_avg_kg
            if fruit_avg_kg is None:
                raise ValueError("row.fruit.fruit_avg_kg is missing")

            self.plant_kg = round(self.fruit_plant * fruit_avg_kg, 1) 
            self.row_kg = round(self.plant_kg * self.row.nb_plant, 1) 

        except Exception as e:
            logger.error(f"💥 Error during Estimation.save(): {e}", exc_info=True)
            raise

        super().save(*args, **kwargs)
