from django.test import TestCase
from django.contrib.auth.models import  Group
from competence.models import CustomUser  # Import your custom user model
from rest_framework import status  
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from django.core.management import call_command
from .api_util import ApiUtil  # Import the ApiUtil class
# from django.conf import settings  # Import the settings module
from competence.models import ( 
    Eleve,  
)

DEBUG = False  # Global DEBUG variable


# Conditional print based on DEBUG setting
def debug_print(param1, param2=None):
    #DEBUG = settings.DEBUG
    if DEBUG:
        if param2 is not None:
            print(f"{param1}: {param2}")
        else:
            print(param1)


class ValidationTestSetup(TestCase): 
    global DEBUG  # Use the global DEBUG variable
    @classmethod
    def setUpTestData(cls):
        cls.client = APIClient()

        # Load data from fixtures 
        call_command('populate_data_init')  # Call management command
        call_command('create_groups_and_permissions')

    def setUp(self):


        self.client = APIClient()
        # Initialize the API utility class
        self.api_util = ApiUtil(self.client) 
        # Create admin user
        self.admin_user = CustomUser.objects.create_user(username='adminuser', password='adminpass', is_staff=True)
        self.admin_group = Group.objects.get(name='admin')
        self.admin_user.groups.add(self.admin_group)
        self.admin_token = AccessToken.for_user(self.admin_user) 

        # Set client credentials for admin user
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')



class AdminPermissionTest(ValidationTestSetup): 
    global DEBUG
    #DEBUG = False
    def setUp(self):
        super().setUp()  # Call the parent setUp to load data

        

    def test_user(self):
        response = self.api_util._create_user('alluser', 'allpass', 'All', 'CustomUser', ['admin','teacher','analytics'])        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(username='alluser').exists())
        self.alluser_user = response.data
        debug_print("test_create_user_all")
        debug_print(response.data)
        
 
        response = self.api_util._create_user('newuser', 'newpass', 'New', 'CustomUser', ['analytics'])
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(username='newuser').exists())
         
        response = self.api_util._create_user('admuser', 'admpass', 'Adm', 'CustomUser', ['admin' ])
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(username='admuser').exists())
        debug_print("test_create_user_admin")
        debug_print(response.data)
         
        response = self.api_util._get_user_list( )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_user_list")
        debug_print(response.data)

        # Assuming response.data contains the list of users
        users = response.data

        # Find the user with the username 'alluser'
        alluser = next((user for user in users if user['username'] == 'alluser'), None)

        if alluser:
            alluser_id = alluser['id']
            debug_print(f"CustomUser 'alluser' has the ID: {alluser_id}")
        else:
            debug_print("CustomUser 'alluser' not found")
  
 
        alluser_id = self.alluser_user['id']
        response = self.api_util._get_user( alluser_id)  #retrieve user with id alluser_id
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_user_id")
        debug_print(response.data)
    
 
        response = self.api_util._delete_user( alluser_id )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CustomUser.objects.filter(username='alluser').exists())


class TeacherPermissionTest(ValidationTestSetup): 
    global DEBUG
    #DEBUG = False
    def setUp(self):
        super().setUp()  # Call the parent setUp to load data
 
 
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.api_util._create_user('teacher1', 'newpass', 'New', 'Teacher', ['teacher'])
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(CustomUser.objects.filter(username='teacher1').exists())
        
 
        self.client.credentials()
        response = self.api_util._login_user('teacher1', 'newpass')
        self.teacher1_token = response.data['access']
        self.client.credentials()
        

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)


         

    def test_get_me_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')  # Assuming you have a teacher token
        response = self.api_util._get_user_me( )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_me_authenticated")
        debug_print(response.data)
        # Assert the response data matches the current user
 

    def test_get_user_roles_authenticated(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')  # Assuming you have a teacher token
        response = self.api_util._get_user_roles( )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_user_roles_authenticated")
        debug_print(response.data) 

        # print all the list 
 
    def test_get_eleve_list(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')  # Assuming you have a teacher token
        response = self.api_util._get_eleve_list( )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_eleves_list")
        debug_print(response.data) 
 
 
    def test_get_niveau(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')  # Assuming you have a teacher token

        response = self.api_util._get_niveau_list( )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_niveau_list")
        debug_print(response.data) 
        value = response.data


        response = self.api_util._get_niveau( value[0]['id'])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_niveau")
        debug_print(response.data) 
 
    def test_create_niveau(self):
        # Use the admin token to create a Niveau
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        
        response = self.api_util._create_niveau(description="New level",niveau="NL") 

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        debug_print("test_create_niveau")
        debug_print(response.data)

        # Validate the created object
        self.assertIn("description", response.data)
        self.assertEqual(response.data['description'], "New level")

 
    def test_get_etape(self):
        # Use teacher token to get the list of Etapes
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')

        # Get list of Etapes
        response = self.api_util._get_etape_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_etape_list")
        debug_print(response.data)

        value = response.data

        # Test fetching a specific Etape by its ID
        response = self.api_util._get_etape(value[0]['id'])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_etape")
        debug_print(response.data)

    def test_create_etape(self):
        # Use the admin token to create an Etape
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        
        response = self.api_util._create_etape(description="New step in the curriculum",etape="DEBUT")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        debug_print("test_create_etape")
        debug_print(response.data)

        # Validate the created object
        self.assertIn("description", response.data)
        self.assertEqual(response.data['description'], "New step in the curriculum")

 
    def test_get_annee(self):
        # Use teacher token to get the list of Annees
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')

        # Get list of Annees
        response = self.api_util._get_annee_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_annee_list")
        debug_print(response.data)
        
        value = response.data

        # Test fetching a specific Annee by its ID
        response = self.api_util._get_annee(value[0]['id'])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_annee")
        debug_print(response.data)

 
    def test_create_annee(self):
        # Use the admin token to create an Annee
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}') 

        response = self.api_util._create_annee(is_active=True,start_date="2023-01-01",stop_date=None, description="New school year 2023 no stopdate")
        
        debug_print("test_create_annee")
        debug_print(response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED) 
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


        # Validate the created object
        self.assertIn("is_active", response.data)
        self.assertEqual(response.data['is_active'], True)
        self.assertEqual(response.data['description'], "New school year 2023 no stopdate")
        ######
 
        response = self.api_util._create_annee(is_active=False,start_date="2023-01-01",stop_date="2024-01-01", description="New school year 2023-2024")
        debug_print("test_create_annee")
        debug_print(response.data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED) 

        # Validate the created object
        self.assertIn("is_active", response.data)
        self.assertEqual(response.data['is_active'], False)
        self.assertEqual(response.data['description'], "New school year 2023-2024")
        self.assertEqual(response.data['start_date'],"2023-01-01")
        self.assertEqual(response.data['stop_date'], "2024-01-01")
         ######
 
        response = self.api_util._create_annee(is_active=True, start_date=None,stop_date=None,description="New school year no date" )
        debug_print("test_create_annee")
        debug_print(response.data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED) 

        # Validate the created object
        self.assertIn("is_active", response.data)
        self.assertEqual(response.data['is_active'], True)
        self.assertEqual(response.data['description'], "New school year no date")
        #self.assertEqual(response.data['start_date'],"2023-01-01")
        self.assertEqual(response.data['stop_date'],None)


    def test_get_matiere(self):
        # Use teacher token to get the list of Matieres
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')

        # Get list of Matieres
        response = self.api_util._get_matiere_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_matiere_list")
        debug_print(response.data)

        value = response.data

        # Test fetching a specific Matiere by its ID
        response = self.api_util._get_matiere(value[0]['id'])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_matiere")
        debug_print(response.data)


    def test_create_matiere(self):
        # Use the admin token to create a Matiere
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        
        response = self.api_util._create_matiere(description="New subject",matiere="N")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        debug_print("test_create_matiere")
        debug_print(response.data)

        # Validate the created object
        self.assertIn("description", response.data)
        self.assertEqual(response.data['description'], "New subject")

 

    def test_create_get_delete_eleve(self):
        # Step 1: Authenticate as admin
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        
        # Step 2: Create teacher users
        teacher1 = self.api_util._create_user('teachertest1', 'teachertestnewpass', 'New1', 'Teacher', ['teacher']).data
        teacher2 = self.api_util._create_user('teachertest2', 'teachertestnewpass', 'New2', 'Teacher', ['teacher']).data
        
        self.client.credentials( )
        response = self.api_util._login_user('teachertest1', 'teachertestnewpass')
        teachertest1_token = response.data['access']
        self.client.credentials( )
        response = self.api_util._login_user('teachertest2', 'teachertestnewpass')
        teachertest2_token = response.data['access']

        self.client.credentials( )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        # Step 3: Get lists of niveaux and teachers
        niveau_list = self.api_util._get_niveau_list().data         
        niveau_id1 = niveau_list[0]['id']
        niveau_id2 = niveau_list[1]['id']


        teacher_list = self.api_util._get_teacher_list().data
        debug_print("Teacher List Response:") 
        debug_print( teacher_list)
        
        # Step 4: Create first eleve
        response = self.api_util._create_eleve(nom="Jean", prenom="Valjean", niveau=niveau_id1, datenaissance="2015-01-02", professeurs=[teacher1['id']])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        debug_print(  response.data)
        #{'id': 11, 'username': 'teachertest1', 'first_name': 'New1', 'last_name': 'Teacher', 'roles': ['teacher']}

        eleve1 = response.data

        # Validate first eleve data 
        self._validate_eleve_data(response.data, "Jean", "Valjean", "2015-01-02", [teacher1])   

        # Step 5: Create second eleve
        response = self.api_util._create_eleve(nom="Jeanne", prenom="Eyre", niveau=niveau_id2, datenaissance="2016-01-02", professeurs=[teacher1['id'],teacher2['id']])
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        debug_print(  response.data)
        
        # Step 6: Authenticate as teacher1 and check eleves assigned to teacher1
        self.client.credentials( ) 
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {teachertest1_token}')
        response = self.api_util._get_eleve_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print( "teachertest1 _get_eleve_list")
        debug_print( response.data)
        self.assertEqual(len(response.data), 2)  # Check teacher1 has 2 eleves
        
        # Step 7: Authenticate as teacher2 and check eleves assigned to teacher2
        self.client.credentials( )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {teachertest2_token}')
        debug_print( "teachertest2 _get_eleve_list")
        response = self.api_util._get_eleve_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print( response.data)
        self.assertEqual(len(response.data), 1)  # Check teacher2 has 1 eleve

        self.client.credentials( )
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')

        

        response = self.api_util._delete_eleve( eleve1['id'] )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Eleve.objects.filter(id=eleve1['id'] ).exists())


    def _validate_eleve_data(self, data, expected_nom, expected_prenom, expected_datenaissance, expected_professeurs_details):

        debug_print( expected_professeurs_details)
        self.assertEqual(len(expected_professeurs_details), 1)  # Check teacher2 has 1 eleve


        self.assertIn("datenaissance", data)
        self.assertEqual(data['datenaissance'], expected_datenaissance)
        self.assertEqual(data['nom'], expected_nom)
        self.assertEqual(data['prenom'], expected_prenom)
        
        # Validate the 'professeurs_details' field instead of 'professeurs'
        self.assertIn("professeurs_details", data)
        
        # Extract IDs from the expected professeurs for comparison
        expected_professeur_ids = [professeur['id'] for professeur in expected_professeurs_details]
        
        # Validate that the details match
        self.assertEqual([professeur['id'] for professeur in data['professeurs_details']], expected_professeur_ids)

  


    def test_create_pdf_layout(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')
        response = self.api_util._create_pdf_layout(header_icon="icon.png", footer_message="Footer text")
        
        # Debugging prints
        debug_print("Create PDFLayout response status:", response.status_code)
        if response.status_code != 201:
            debug_print("Create PDFLayout response content:", response.content)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


    def test_get_pdf_layout(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')
        response = self.api_util._get_pdf_layout_list()
        
        # Debugging prints
        debug_print("Get PDFLayout response status:", response.status_code)
        if response.status_code != 200:
            debug_print("Get PDFLayout response content:", response.content)

        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_create_score_rule_point(self):
        # Use the admin token to create a ScoreRulePoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}')

        response = self.api_util._create_score_rule_point(scorelabel="Test Label", score=10, description="Test Description")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        debug_print("test_create_score_rule_point")
        debug_print(response.data)

        # Validate the created object
        self.assertIn("scorelabel", response.data)
        self.assertEqual(response.data['scorelabel'], "Test Label")

    def test_get_score_rule_point_list(self):
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')  # Assuming you have a teacher token

        response = self.api_util._get_score_rule_point_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_score_rule_point_list")
        debug_print(response.data) 
        value = response.data

        # Optional: Assert that there is at least one score rule point if you have created any
        if value:
            response = self.api_util._get_score_rule_point(value[0]['id'])
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            debug_print("test_get_score_rule_point")
            debug_print(response.data) 



 
 
    # last methode to see statistiques
    def test_zzz_print_test_statistique(self):
        # Output the call counts
        print("Call count of all tested API ZZ")
        print(self.api_util.get_call_counts())  # Display the counts for debugging


  