# Validation test: Full API workflow

# workflow validation test is a API-only workflow-driven integration test 
# — no manual object.create : only real API calls like a real mobile client + ML would do.
# ✅ DB is initialized only from fixtures
# ✅ POST /api/images/ is used to upload image
# ✅ POST /ml_result/ mimics ML posting result
# ❌ No Image.objects.create(...) 
# ✅ All calls are external (API or request)

from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.conf import settings
import requests
from rest_framework import status
from PomoloBeeCore.models import Image, Field, Farm,User, Fruit, Row,Image,Estimation

import logging
logger = logging.getLogger(__name__) 

from django.test import override_settings
import tempfile
import os

# Create a temp dir for test media
TEMP_MEDIA_ROOT = tempfile.mkdtemp()

@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class DjangoWorkflowTest(TestCase):
    """Test full Django workflow including database initialization, API calls, and ML processing."""

    fixtures = ["initial_superuser.json","initial_farms.json","initial_fields.json", "initial_fruits.json", "initial_rows.json"]

    def setUp(self):
        """Set up URLs for API calls."""
        self.upload_url = reverse("image-upload")
        self.ml_result_url = reverse("ml-result", args=[1])  # Assuming ML result for image_id=1
        self.process_url = f"{settings.ML_API_URL}/process-image"

    ### 1️⃣ TEST INITIAL DATABASE STATE ###
    def test_001_check_fixture_loading(self):
        """Check if fixtures were correctly loaded."""
        self.assertEqual(User.objects.count(), 1, "Expected 1 user in the database.")
        self.assertEqual(Farm.objects.count(), 1, "Expected 1 farm in the database.")
        self.assertEqual(Field.objects.count(), 6, "Expected 6 fields in the database.")
        self.assertEqual(Fruit.objects.count(), 6, "Expected 6 fruits in the database.")
        self.assertEqual(Row.objects.count(), 70, "Expected 70 rows in the database.")

    def test_002_check_example_data(self):
        """Check that specific row, fruit, and field exist with correct values."""
        field = Field.objects.get(short_name="C1")
        self.assertEqual(field.name, "ChampMaison")

        fruit = Fruit.objects.get(short_name="Swing_CG1")
        self.assertEqual(fruit.name, "Cultivar Swing on CG1")

        row = Row.objects.get(short_name="R3", field_id=1 )
        self.assertEqual(row.name, "Rang 3 cote maison Swing 3")
        self.assertEqual(row.nb_plant, 40)
        self.assertEqual(row.field.id, 1)  # Foreign key to Field
        self.assertEqual(row.fruit.id, 1)  # Foreign key to Fruit

    ### 2️⃣ TEST INITIAL API ENDPOINTS ###
    def test_003_get_fields(self):
        """Test GET /api/fields/ returns the correct data."""
        response = self.client.get(reverse("fields-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK) 

        fields = response.json()["data"]["fields"]
        self.assertEqual(len(fields), 6)  # ✅ Now correctly checking the list
        self.assertEqual(fields[0]["short_name"], "C1")


    def test_004_get_fruits(self):
        """Test GET /api/fruits/ returns the correct data."""
        response = self.client.get(reverse("fruits-list"))
        fruits = response.json()["data"]["fruits"]
        self.assertEqual(len(fruits), 6)  # ✅ Now correctly checking the list

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(fruits), 6)  # Expecting 6 fruits
        self.assertEqual(fruits[0]["short_name"], "Swing_CG1")

    def test_005_get_locations(self):
        """Test GET /api/locations/ returns fields + associated rows."""
        response = self.client.get(reverse("locations"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.json())
        locations = response.json()["data"]["locations"]
        self.assertEqual(len(locations), 6) # Expecting 6 fields 
        self.assertEqual(len(locations[0]["rows"]), 28)  # Example: Field 1 has 28 rows

    ### 3️⃣ TEST IMAGE UPLOAD & PROCESSING ###


    def test_006_upload_image(self): 
        """Test image upload to Django."""
        with open("media/images/orchard.jpg", "rb") as img_file:
            image = SimpleUploadedFile("orchard.jpg", img_file.read(), content_type="image/jpeg")
        
        response = self.client.post(
            self.upload_url,
            {"image": image, "row_id": 1, "date": "2024-03-14"},
            format="multipart"
        )

        # print("PRINT - Upload response:", response.status_code, response.json())  # optional debug
        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())
 
        self.assertEqual(response.status_code, 201)
        self.assertIn("image_id", response.json()["data"])
 
    def test_007_django_sends_image_to_ml(self):
        """Test if Django sends image to ML via API, after image upload."""

        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
            logger.debug("LOG - Upload response: %s %s", upload_response.status_code, upload_response.json())
        self.assertEqual(upload_response.status_code, 201)
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        payload = {
            "image_url": f"{settings.MEDIA_URL}images/image-{image_id}.jpg",
            "image_id": image_id
        }

        response = requests.post(self.process_url, json=payload)
        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())
        response_json = response.json()
        if response.status_code != 200:
            print("ML error:", response.status_code, response_json)
            self.fail(f"ML failed to accept image for processing: {response_json}")
        else:
            self.assertIn("message", response_json["data"])


 

    def test_008_ml_sends_results_back_to_django(self): 
        """Simulate ML returning results to Django."""
        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        self.assertEqual(upload_response.status_code, 201)
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        payload = {"fruit_plant": 15, "confidence_score": 0.85, "processed": True}
        response = self.client.post(
            reverse("ml-result", args=[image_id]),
            data=payload,
            content_type="application/json"
        )

        

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json()["data"])

        img_obj = Image.objects.get(id=image_id)
        self.assertTrue(Estimation.objects.filter(image=img_obj).exists())
        estimation = Estimation.objects.get(image=img_obj)
        self.assertEqual(estimation.fruit_plant, 15)
 
        self.assertTrue(img_obj.processed)


    def test_009_django_fetches_ml_results(self): 
        """Ensure Django returns ML results for a processed image."""

        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            ) 

        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        # Simulate ML result
        self.client.post(
            reverse("ml-result", args=[image_id]),
            data={"fruit_plant": 10, "confidence_score": 0.9, "processed": True},
            content_type="application/json"
        )

        response = self.client.get(reverse("image-estimations", args=[image_id]))

        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())

        self.assertEqual(response.status_code, 200) 
        data = response.json()["data"]
        self.assertEqual(data["fruit_plant"], 10)
        self.assertEqual(data["confidence_score"], 0.9)
 
 


    def test_010_fetch_estimations(self):
        """Test if Django correctly returns yield estimations.""" 

        # Upload image
        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        image_id = upload_response.json()["data"]["image_id"]

        # Simulate ML result
        self.client.post(
            reverse("ml-result", args=[image_id]),
            data={"fruit_plant": 12, "confidence_score": 0.88, "processed": True},
            content_type="application/json"
        )

        # Fetch estimation
        response = self.client.get(reverse("image-estimations", args=[image_id]))
        self.assertEqual(response.status_code, 200)
        self.assertIn("fruit_plant", response.json()["data"])


    def test_011_list_uploaded_images(self):
        """Upload images via API and fetch them with GET /api/images/list/"""

        # Upload first image
        with open("media/images/orchard.jpg", "rb") as img1:
            upload_response1 = self.client.post(
                reverse("image-upload"),
                {"image": img1, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        self.assertEqual(upload_response1.status_code, 201)
        id1 = upload_response1.json()["data"]["image_id"]

        # Upload second image
        with open("media/images/orchard.jpg", "rb") as img2:
            upload_response2 = self.client.post(
                reverse("image-upload"),
                {"image": img2, "row_id": 1, "date": "2024-03-15"},
                format="multipart"
            )
        self.assertEqual(upload_response2.status_code, 201)
        id2 = upload_response2.json()["data"]["image_id"]

        # Now call image list endpoint
        list_url = reverse("image-list")
        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, 200)

        images = list_response.json()["data"]["images"]
        ids = [img["image_id"] for img in images]
        self.assertIn(id1, ids)
        self.assertIn(id2, ids)

        # Check pagination keys
        self.assertIn("total", list_response.json()["data"])
        self.assertIn("limit", list_response.json()["data"])
        self.assertIn("offset", list_response.json()["data"])

        # Optional: filter by date
        filter_response = self.client.get(list_url, {"date": "2024-03-14"})
        self.assertEqual(filter_response.status_code, 200)
        self.assertEqual(filter_response.json()["data"]["total"], 1)
        self.assertEqual(filter_response.json()["data"]["images"][0]["date"], "2024-03-14")



    def test_012_full_image_to_estimation_workflow(self): 
        from PomoloBeeCore.models import Image

        # 1️⃣ Upload image (as App would do)
        with open("media/images/orchard.jpg", "rb") as img:
            response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
            logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())

        self.assertEqual(response.status_code, 201)
        image_id = response.json()["data"]["image_id"]

        # 2️⃣ Simulate ML posting result
        ml_result_payload = {
            "fruit_plant": 12,
            "confidence_score": 0.88,
            "processed": True
        }
        response = self.client.post(
            reverse("ml-result", args=[image_id]),
            data=ml_result_payload,
            content_type="application/json"
        )
        self.assertEqual(response.status_code, 200)

        # 3️⃣ Get ML result from Django 
        response = self.client.get(reverse("image-estimations", args=[image_id]))

        self.assertEqual(response.status_code, 200) 
        self.assertEqual(response.json()["data"]["fruit_plant"], 12)
        self.assertEqual(response.json()["data"]["confidence_score"], 0.88)
  
        self.assertIn("plant_kg", response.json()["data"])



    def test_013_get_estimations_by_field(self):
        """GET /fields/{field_id}/estimations/"""
        # Upload + process

        ...

        # Upload image
        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        image_id = upload_response.json()["data"]["image_id"]

        # Simulate ML result
        self.client.post(
            reverse("ml-result", args=[image_id]),
            data={"fruit_plant": 12, "confidence_score": 0.88, "processed": True},
            content_type="application/json"
        )

        # Fetch estimation 

        response = self.client.get(reverse("field-estimations", args=[1]))
        self.assertEqual(response.status_code, 200)
        self.assertIn("estimations", response.json()["data"])

    def test_014_delete_uploaded_image(self):
        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"), {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]
        response = self.client.delete(reverse("image-delete", args=[image_id]))
        self.assertEqual(response.status_code, 200)


    def test_015_get_ml_version(self):
        response = self.client.get(reverse("ml-version"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("model_version", response.json()["data"])


    def test_016_retry_processing(self):
        """Test retrying ML processing for an uploaded image that is not yet processed."""

        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        self.assertEqual(upload_response.status_code, 201)
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        # Make sure image is not marked as processed
        image_obj = Image.objects.get(id=image_id)
        self.assertFalse(image_obj.processed)

        # Send retry request
        retry_response = self.client.post(
            reverse("retry-processing"),
            {"image_id": image_id},
            content_type="application/json"
        )

        self.assertIn(retry_response.status_code, [200, 503])
        if retry_response.status_code == 200:
            self.assertIn("message", retry_response.json()["data"])
        elif retry_response.status_code == 503:
            self.assertIn("ML service unavailable", retry_response.json()["error"]["message"])

@override_settings(MEDIA_ROOT=TEMP_MEDIA_ROOT)
class DjangoWorkflowRobustnessTest(TestCase):
    """Test full Django workflow including database initialization, API calls, and ML processing."""

    fixtures = ["initial_superuser.json","initial_farms.json","initial_fields.json", "initial_fruits.json", "initial_rows.json"]

    def setUp(self):
        """Set up URLs for API calls."""
        self.upload_url = reverse("image-upload")
        self.ml_result_url = reverse("ml-result", args=[1])  # Assuming ML result for image_id=1
        self.process_url = f"{settings.ML_API_URL}/process-image"


    def test_101_estimation_requested_without_result(self): 
        """App uploads image but ML never responds → estimation should not be available."""

        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        response = self.client.get(reverse("image-estimations", args=[image_id]))
        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())
        self.assertEqual(response.status_code, 404)
        self.assertIn("error", response.json())
        self.assertEqual(response.json()["error"]["code"], "404_NOT_FOUND")


    def test102_estimation_after_ml_refused_image(self): 
        """Simulate ML refusing image (e.g. bad request) → estimation should not exist."""

        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        # Simulate ML rejecting the image processing request
        # → send an intentionally incomplete payload
        bad_payload = {"image_id": image_id}  # image_url missing

        ml_response = requests.post(self.process_url, json=bad_payload)
        #logger.debug("LOG - Upload response: %s %s", ml_response.status_code, ml_response.json())
        self.assertIn(ml_response.status_code, [400, 404])


        # App tries to fetch estimation even though ML never processed it
        response = self.client.get(reverse("image-estimations", args=[image_id]))
        logger.debug("LOG - Upload response: %s %s", response.status_code, response.json())
        self.assertEqual(response.status_code, 404)


    def test_103_estimation_after_failed_result_post(self): 
        """Simulate ML trying to return results, but Django rejects them (e.g. invalid payload)."""

        with open("media/images/orchard.jpg", "rb") as img:
            upload_response = self.client.post(
                reverse("image-upload"),
                {"image": img, "row_id": 1, "date": "2024-03-14"},
                format="multipart"
            )
        if upload_response.status_code != 201:
            print("Upload failed:", upload_response.status_code, upload_response.content)

        self.assertEqual(upload_response.status_code, 201)
        image_id = upload_response.json()["data"]["image_id"]

        # Simulate ML POSTing result with invalid data
        bad_payload = {"fruit_plant": None, "processed": True}  # invalid missing score
        post_response = self.client.post(
            reverse("ml-result", args=[image_id]),
            data=bad_payload,
            content_type="application/json"
        )
        self.assertIn(post_response.status_code, [400, 500])

        # Still try to fetch estimation
        response = self.client.get(reverse("image-estimations", args=[image_id]))
        self.assertEqual(response.status_code, 404)
