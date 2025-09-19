from django.test import TestCase
from django.contrib.auth.models import User
from PomoloBeeCore.models import Image,  Estimation, Row, Fruit, Field, Farm
from datetime import date
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection

class LoadFixtureDataTest(TestCase):
    """Test if initial fixture data is correctly loaded in the test database."""

    fixtures = [
        "initial_superuser.json",
        "initial_farms.json",
        "initial_fields.json",
        "initial_fruits.json",
        "initial_rows.json"
    ]

    def test_superuser_exists(self):
        """Check if superuser 'pomobee' exists."""
        user_exists = User.objects.filter(username="pomobee").exists()
        self.assertTrue(user_exists, "Expected superuser 'pomobee' to exist in the database.")

    def test_farms_count(self):
        """Check that at least 1 farm is loaded from fixture."""
        farm_count = Farm.objects.count()
        self.assertGreaterEqual(farm_count, 1, "Expected at least 1 Farm in the database.")

    def test_field_count(self):
        """Check if 6 fields are correctly loaded."""
        field_count = Field.objects.count()
        self.assertEqual(field_count, 6, "Expected 6 fields in the database.")

    def test_fruit_count(self):
        """Check if 6 fruits are correctly loaded."""
        fruit_count = Fruit.objects.count()
        self.assertEqual(fruit_count, 6, "Expected 6 fruits in the database.")

    def test_row_count(self):
        """Check if 28 rows are correctly loaded."""
        row_count = Row.objects.filter(field_id=1).count()
        self.assertEqual(row_count, 28, "Expected 28 rows in the database for field 1.")
        """Check if 70 rows are correctly loaded."""
        row_count = Row.objects.count()
        self.assertEqual(row_count, 70, "Expected 70 rows in the database ")


    def test_specific_field_data(self):
        """Verify specific field data (ChampMaison - C1)."""
        field = Field.objects.get(short_name="C1")
        self.assertEqual(field.name, "ChampMaison")
        self.assertEqual(field.description, "Champ situé sur la parcelle de la maison")
        self.assertEqual(field.orientation, "NW")

    def test_specific_fruit_data(self):
        """Verify specific fruit data (Swing_CG1)."""
        fruit = Fruit.objects.get(short_name="Swing_CG1")
        self.assertEqual(fruit.name, "Cultivar Swing on CG1")
        self.assertEqual(fruit.description, "Late harvest, sweet, crisp texture, medium storage (3-4 months), aromatic")
        self.assertEqual(fruit.yield_start_date.strftime("%Y-%m-%d"), "2025-09-15")
        self.assertEqual(fruit.yield_end_date.strftime("%Y-%m-%d"), "2025-10-05")
        self.assertEqual(fruit.yield_avg_kg, 40.0)
        self.assertEqual(fruit.fruit_avg_kg, 0.2)

    def test_specific_row_data(self):
        """Verify specific row data (R3)."""
        row = Row.objects.get(short_name="R3", field_id=1 )
        self.assertEqual(row.name, "Rang 3 cote maison Swing 3")
        self.assertEqual(row.nb_plant, 40)
        self.assertEqual(row.field.id, 1)  # Foreign key to Field
        self.assertEqual(row.fruit.id, 1)  # Foreign key to Fruit

    def test_default_svg_map_applied_on_save(self):
        """Test that default SVG map path is applied when not set."""
        # Create a minimal farm for testing
        farm = Farm.objects.create(name="DummyFarm", owner=User.objects.create_user("dummy", password="1234"))
        field = Field.objects.create(short_name="TestField", name="Test Field", farm=farm)
 

        self.assertTrue(field.svg_map)  # Should not be None
        self.assertEqual(str(field.svg_map), 'fields/svg/default_map.svg')

    def test_svg_map_field_properties(self):
        field = Field._meta.get_field("svg_map")
        self.assertTrue(field.null)
        self.assertEqual(field.default, 'fields/svg/default_map.svg')


 

class ModelTableExistenceTest(TestCase):
    # check existence of table that are not filled with data with fixture

    def setUp(self):
        # Create superuser (owner of the farm)
        self.user = User.objects.create_superuser(username="admin", password="adminpass", email="admin@example.com")
        
        # Create Farm with owner
        self.farm = Farm.objects.create(name="TestFarm", owner=self.user)
        
        # Create related Field and Fruit
        self.field = Field.objects.create(short_name="TestField", name="Test Field", farm=self.farm)
        self.fruit = Fruit.objects.create(
            short_name="Apple",
            name="Apple",
            description="Test apple",
            yield_start_date="2024-01-01",
            yield_end_date="2024-12-31",
            yield_avg_kg=2.0,
            fruit_avg_kg=0.3
        )
        
        # Create Row for test
        self.row = Row.objects.create(
            field=self.field,
            fruit=self.fruit,
            name="Row A",
            short_name="RA",
            nb_plant=50
        )

    def test_image_table(self):
        self.assertEqual(Image.objects.count(), 0)
        
        fake_image = SimpleUploadedFile(
            name='test.jpg',
            content=b'\x47\x49\x46\x38\x89\x61',  # Just some fake image bytes
            content_type='image/jpeg'
        )

        img = Image.objects.create(
            image_file=fake_image,
            row=self.row,
            date=date.today()
        )

        self.assertEqual(Image.objects.count(), 1)
 
    def test_estimation_computes_plant_and_row_kg_on_save(self):
        # Create a test image for linkage (optional, but model allows null)
        image = Image.objects.create(image_file="test.jpg", row=self.row, date=date.today())

        # Create estimation with only row, image, fruit_plant — the rest should be auto-calculated
        estimation = Estimation.objects.create(
            image=image,
            row=self.row,
            date=date.today(),
            fruit_plant=12,  # 👈 Set fruit count per plant
            maturation_grade=0.5,
            confidence_score=0.9,
            source=Estimation.EstimationSource.IMAGE
        )

        fruit_avg_kg = self.row.fruit.fruit_avg_kg
        nb_plant = self.row.nb_plant

        expected_plant_kg = 12 * fruit_avg_kg
        expected_row_kg = expected_plant_kg * nb_plant

        self.assertAlmostEqual(estimation.plant_kg, expected_plant_kg, places=4)
        self.assertAlmostEqual(estimation.row_kg, expected_row_kg, places=4)
        self.assertEqual(estimation.image, image)
        self.assertEqual(estimation.row, self.row)
        self.assertEqual(estimation.source, "MLI")
        self.assertEqual(str(estimation), f"Estimation {estimation.id} - {self.row.name} on {estimation.date}")



class SchemaColumnCheckTest(TestCase):
    def get_column_names(self, model):
        """Returns set of column names for given model."""
        with connection.cursor() as cursor:
            return set(
                column.name for column in connection.introspection.get_table_description(cursor, model._meta.db_table)
            )

    def assertColumnsExactly(self, model, expected_columns):
        actual_columns = self.get_column_names(model)
        missing = expected_columns - actual_columns
        unexpected = actual_columns - expected_columns
        self.assertFalse(missing, f"Missing columns in {model.__name__}: {missing}")
        self.assertFalse(unexpected, f"Unexpected columns in {model.__name__}: {unexpected}")

    def test_field_model_columns(self):
        self.assertColumnsExactly(Field, {
            "id", "short_name", "name", "description", "orientation", "farm_id", "svg_map", "background_image"
        })

    def test_fruit_model_columns(self):
        self.assertColumnsExactly(Fruit, {
            "id", "short_name", "name", "description",
            "yield_start_date", "yield_end_date", "yield_avg_kg", "fruit_avg_kg"
        })

    def test_row_model_columns(self):
        self.assertColumnsExactly(Row, {
            "id", "short_name", "name", "nb_plant", "fruit_id", "field_id"
        })

    def test_image_model_columns(self):
        self.assertColumnsExactly(Image, {
            "id", "row_id", "date", "xy_location","upload_date", "image_file", "original_filename",
             "processed", "status", "processed_at", 'user_fruit_plant'
        })

    def test_estimation_model_columns(self):
        self.assertColumnsExactly(Estimation, {
            "id", "image_id", "row_id", "date", "timestamp", "fruit_plant", "plant_kg",
            "row_kg",  "maturation_grade", "confidence_score", "source"
        })
