import os
from io import BytesIO
from PIL import Image as PILImage

from django.test import TestCase
from django.urls import reverse
from PomoloBeeCore.models import   Image

import logging
logger = logging.getLogger(__name__) 


class MLUnavailableIntegrationTest(TestCase):
    """Test fallback behavior when ML service is unavailable."""
    
    # Load row, field, farm, fruit, superuser data
    fixtures = [
        "initial_superuser.json",
        "initial_farms.json",
        "initial_fields.json",
        "initial_fruits.json",
        "initial_rows.json"
    ]

    #def setUp(self):
        # Set ML_API_URL to an invalid value to simulate unavailability
        # os.environ["ML_API_URL"] = "http://ml-service:001/" # we stop ML
        
 

    def test_get_ml_version_returns_unavailable(self):
        response = self.client.get(reverse("ml-version"))
        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())

        self.assertEqual(response.status_code, 503)

        data = response.json()
        self.assertIn("error", data)
        self.assertEqual(data["error"]["code"], "ML_UNAVAILABLE")

    def test_retry_processing_when_ml_unavailable(self): 
        img = Image.objects.create(image_file="test.jpg", row_id=3, date="2024-03-14", processed=False)

        response = self.client.post("/api/retry_processing/", {"image_id": img.id}, format="json")
        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())
 
        self.assertEqual(response.status_code, 503)

        data = response.json()
        self.assertEqual(data["error"]["code"], "ML_UNAVAILABLE")

    def test_upload_image_when_ml_unavailable(self):
        # This assumes row_id=3 exists via fixtures
        image_file = BytesIO()
        PILImage.new("RGB", (100, 100)).save(image_file, format="JPEG")
        image_file.seek(0)
        image_file.name = "test.jpg"

        from django.core.files.uploadedfile import SimpleUploadedFile

        image_file = SimpleUploadedFile("test.jpg", image_file.read(), content_type="image/jpeg")


        response = self.client.post(
            "/api/images/",
            data={
                "image": image_file,
                "row_id": 3,
                "date": "2024-03-14",
                "xy_location": "12.34,56.78"  # optional now
            }
        )


        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())

        self.assertEqual(response.status_code, 503)

        data = response.json()
        self.assertEqual(data["error"]["code"], "ML_UNAVAILABLE")
