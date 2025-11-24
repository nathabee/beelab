from django.test import TestCase
from django.urls import reverse
import requests
from rest_framework import status
from PomoloBeeCore.models import Image,Farm, Field, Fruit, Row,User
from django.conf import settings

class MLIntegrationTest(TestCase):
    """Test interaction between Django and Flask ML API."""

    def setUp(self): 

        self.user = User.objects.create_user(username="testuser", password="testpass")

        self.farm = Farm.objects.create(name="Test Farm", owner=self.user)

 
        self.field = Field.objects.create(
            short_name="F1", name="Test Field", orientation="N", farm=self.farm
        )
        self.fruit = Fruit.objects.create(
            short_name="R", name="Red Fruit", description="",
            yield_start_date="2024-01-01", yield_end_date="2024-12-01",
            yield_avg_kg=2.5, fruit_avg_kg=0.3
        )
        self.row = Row.objects.create(
            short_name="R1", name="Row 1", nb_plant=30,
            field=self.field, fruit=self.fruit
)


        """Set up test data."""
        self.image = Image.objects.create(
            image_file="images/orchard.jpg",
            processed=False,
            row=self.row,
            date="2024-03-14"
        )

        self.ml_api_url = settings.ML_API_URL  # Ensure this is set in settings.py

    def test_django_sends_image_to_ml(self):
        """Test if Django correctly sends an image processing request to Flask."""
        payload = {
            "image_url": f"/media/{self.image.image_file}",
            "image_id": self.image.id
        }
        response = requests.post(f"{self.ml_api_url}/process-image", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json().get("data", {}))



    def test_ml_sends_results_back_to_django(self):
        """Test if Flask successfully sends ML results back to Django."""
        payload = {
            "fruit_plant": 15,
            "confidence_score": 0.85,
            "processed": True
        }
        response = self.client.post(
            reverse("ml-result", args=[self.image.id]), data=payload, content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("message", response.json().get("data", {}))

        # Ensure image is updated
        self.image.refresh_from_db()
        self.assertTrue(self.image.processed)

        # ✅ Ensure estimation was created
        from PomoloBeeCore.models import Estimation
        estimations = Estimation.objects.filter(image=self.image)
        self.assertEqual(estimations.count(), 1)

        estimation = estimations.first()
        expected_plant_kg = 15 * self.fruit.fruit_avg_kg
        expected_row_kg = expected_plant_kg * self.row.nb_plant

        self.assertEqual(estimation.fruit_plant, 15)
        self.assertEqual(estimation.confidence_score, 0.85)
        self.assertAlmostEqual(estimation.plant_kg, expected_plant_kg, places=3)
        self.assertAlmostEqual(estimation.row_kg, expected_row_kg, places=3) 


    def test_django_fetches_ml_results(self):
        """Test if Django correctly retrieves ML results after processing."""
        from PomoloBeeCore.models import Estimation

        # Create estimation manually (as if ML had processed)
        estimation = Estimation.objects.create(
            image=self.image,
            row=self.row,
            date=self.image.date,
            fruit_plant=10,
            confidence_score=0.9,
            maturation_grade=0.2,
            plant_kg=10 * self.fruit.fruit_avg_kg,
            row_kg=10 * self.fruit.fruit_avg_kg * self.row.nb_plant, 
            source="MLI"
        )

        self.image.processed = True
        self.image.save()
 
        response = self.client.get(reverse("image-estimations", args=[self.image.id]))


        self.assertEqual(response.status_code, 200)

        data = response.json()["data"]
        self.assertEqual(data["fruit_plant"], 10)
        self.assertEqual(data["confidence_score"], 0.9)
        self.assertEqual(data["image_id"], self.image.id)
        self.assertEqual(data["source"], "Machine Learning (Image)")
