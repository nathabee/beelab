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
    Eleve, Report 
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


class IntegrationTestSetup(TestCase): 
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

 
class Workflow_Admin(IntegrationTestSetup): 
    global DEBUG
    #DEBUG = False
    def setUp(self):
        super().setUp()  # Call the parent setUp to load data
 
 
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}') 


         

    def test_get_me_authenticated(self):
        #self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher1_token}')  # Assuming you have a teacher token
        response = self.api_util._get_user_me( )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        debug_print("test_get_me_authenticated")
        debug_print(response.data)



   
class Workflow_Teacher(IntegrationTestSetup): 
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

    def update_report_with_max_scores(self, retrieved_report, score_rule_point):
        updated_catalogue_data = []

        # Helper function to get the maximum score for a given scorerule
        def get_max_scorerule_point(scorerule_id):
            # Filter score_rule_points by scorerule and get the one with the maximum score
            relevant_points = [point for point in score_rule_point if point['scorerule'] == scorerule_id]
            return max(relevant_points, key=lambda x: x['score']) if relevant_points else None

        # Iterate through each report catalogue (each corresponding to a `resultat`)
        for report_catalogue in retrieved_report['report_catalogues']:
            resultats_data = []

            for resultat in report_catalogue['resultats']:
                # Prepare `resultat` object with updated fields
                updated_resultat = {
                    'id': resultat['id'],  # ID of the Resultat to update
                    'resultat_details': []  # To store updated resultat_details
                }

                # Iterate through each `resultat_detail` to update their score based on scorerule
                for resultat_detail in resultat['resultat_details']:
                    item = resultat_detail['item']
                    scorerule_id = item['scorerule']  # Retrieve scorerule ID
                    max_scorerule_point = get_max_scorerule_point(scorerule_id)  # Get max score for the scorerule

                    # Prepare the updated detail
                    updated_detail = {
                        'id': resultat_detail['id'],  # ID of the ResultatDetail to update
                        'item_id': item['id'],  # Primary key of Item
                        'score': max_scorerule_point['score'] if max_scorerule_point else 0,  # Updated score
                        'scorelabel': max_scorerule_point['scorelabel'] if max_scorerule_point else "N/A",  # Optional score label
                        'observation': item['description'] if max_scorerule_point else "No matching scorerule found"  # Set observation based on scorerule match
                    }

                    # Append the updated detail to the resultat
                    updated_resultat['resultat_details'].append(updated_detail)

                # Append the updated resultat data
                resultats_data.append(updated_resultat)

            # Append the updated catalogue information
            updated_catalogue_data.append({
                'id': report_catalogue['id'],  # ID of the associated Catalogue
                'resultats': resultats_data  # This should be an array of updated resultats
            })

        # Return the full report structure, including report level fields
        return {
            'id': retrieved_report['id'],  # Report ID
            'eleve': retrieved_report['eleve'],  # Eleve ID
            'professeur': retrieved_report['professeur'],  # Professeur ID
            'pdflayout': retrieved_report['pdflayout'],  # PDFLayout ID
            'report_catalogues_data': updated_catalogue_data  # Updated report_catalogues data
        }

    def test_fullreport_workflow(self):


        debug_print("#######################################")
        debug_print("#######################################")
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.admin_token}') 

        # Step 1: Create  teacher
        teacher1 = self.api_util._create_user('teachertest1', 'teachertestnewpass', 'New1', 'Teacher', ['teacher']).data 
        response = self.api_util._login_user('teachertest1', 'teachertestnewpass')
        teachertest1_token = response.data['access']
        debug_print("Created teachertest1:", teacher1['id'])


        teacher2 = self.api_util._create_user('teachertest2', 'teachertestnewpass', 'New2', 'Teacher', ['teacher']).data 
        response = self.api_util._login_user('teachertest2', 'teachertestnewpass')
        teachertest2_token = response.data['access']
        debug_print("Created teachertest2:", teacher2['id'])


        # Step 2: Create Eleve using predefined niveau_id
        niveau_id = 7  # Predefined niveau_id
        response = self.api_util._create_eleve(
            nom="Jean", 
            prenom="Valjean", 
            niveau=niveau_id, 
            datenaissance="2015-01-02", 
            professeurs=[teacher1['id']]
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Create Eleve1 failed: {response.status_code} - {response.content}")
        eleve1 = response.data
        debug_print("Created for teacher1 only Eleve ID:", eleve1['id'])


        response = self.api_util._create_eleve(
            nom="Louis", 
            prenom="Duroc", 
            niveau=niveau_id, 
            datenaissance="2016-01-02", 
            professeurs=[teacher2['id'],teacher1['id']]
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Create Eleve2 failed: {response.status_code} - {response.content}")
        eleve2 = response.data
        debug_print("Created for teacher1 and teacher2  Eleve ID:", eleve2['id'])



        response = self.api_util._get_score_rule_point_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        score_rule_point = response.data
        debug_print("get_score_rule_point_list",response.data) 

        # Step 3: Set PDF layout and catalogue IDs
        pdflayout_id = 1  # Predefined layout_id
        catalogue_ids = [13,28]  # Array of catalogue IDs
        debug_print("Using pdflayout_id = 1 and catalogue_ids =", catalogue_ids)

        # Step 4: Teacher login to list reports
        debug_print("login as teacher1 =", teacher1['id'])
        self.client.credentials()
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {teachertest1_token}')
        response = self.api_util._get_eleve_list()
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Get Eleve list failed: {response.status_code} - {response.content}")
        eleve_list = response.data
        debug_print("eleve_list of teacher1 =", eleve_list)

        # Step 5: Select the created Eleve and retrieve reports
        eleve_id = next((e['id'] for e in eleve_list if e['nom'] == "Jean" and e['prenom'] == "Valjean"), None)
        self.assertIsNotNone(eleve_id, "Eleve was not found in the list.")
 
        response = self.api_util._get_eleve_report(eleve1['id'])
        debug_print("_get_eleve_report  for eleve1 response.data", response.data)
  
        self.assertEqual(response.status_code, status.HTTP_200_OK, "Expected a 200 OK status when no reports exist.")
        self.assertEqual(response.data, [], "Expected an empty list when no reports exist.")
 
        # Step 6: Create an empty report
        debug_print("Creating report with eleve_id:", eleve1['id'])
        response = self.api_util._create_fullreport(
            eleve_id=eleve1['id'], 
            professeur_id=teacher1['id'], 
            pdflayout_id=pdflayout_id, 
            catalogue_ids=catalogue_ids
        )
        debug_print("######_create_fullreport  response.data", response.data)


        # Assertions after the fullreport creation ################################
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Create Report failed: {response.status_code} - {response.content}")
        report_data = response.data
        self.assertIn("eleve", report_data)
        self.assertEqual(report_data['eleve'], eleve1['id'])
        report_id = report_data['id']  # Get the newly created report ID

        # Ensure the report was created correctly
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Create Report failed: {response.status_code} - {response.content}")

        # Check that the correct number of catalogues and resultats were created
        self.assertEqual(len(report_data['report_catalogues']), len(catalogue_ids), "Mismatch in number of catalogues created.")

        # Now, get the report's resultats and verify the initial values
        for report_catalogue in report_data['report_catalogues']:
            for resultat in report_catalogue['resultats']:
                # Ensure score and seuils are initialized properly
                self.assertEqual(resultat['score'], -1, "Expected initial score to be -1")
                self.assertEqual(resultat['seuil1_percent'], -1, "Expected initial seuil1_percent to be -1")
                self.assertEqual(resultat['seuil2_percent'], -1, "Expected initial seuil2_percent to be -1")
                self.assertEqual(resultat['seuil3_percent'], -1, "Expected initial seuil3_percent to be -1")

                for resultat_detail in resultat['resultat_details']:
                    # Ensure ResultatDetail score and fields are initialized properly
                    self.assertEqual(resultat_detail['score'], -1, "Expected initial ResultatDetail score to be -1")
                    self.assertEqual(resultat_detail['scorelabel'], '?', "Expected initial ResultatDetail scorelabel to be '?'")
                    self.assertEqual(resultat_detail['observation'], '', "Expected initial ResultatDetail observation to be empty")


        # Step 7: Get Report from eleve and Validate creation 

        response = self.api_util._get_eleve_report( eleve1['id'])
        debug_print("_get_eleve_report for eleve1 response.data", response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Get Report failed: {response.status_code} - {response.content}")
 

        # Step 8: Get FullReport with report_id and Validate creation
        debug_print("_get_fullreport calling for report id", report_id)
        response = self.api_util._get_fullreport(report_id)
        debug_print("#######################################")
        debug_print("#######################################")
        debug_print("_get_fullreport  json_data_get = ", response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Get Report failed: {response.status_code} - {response.content}")
        retrieved_report = response.data
        self.assertEqual(retrieved_report['id'], report_id, "Report ID mismatch.")
        self.assertEqual(retrieved_report['eleve'], eleve1['id'], "Eleve ID mismatch in report.")
        self.assertEqual(retrieved_report['professeur'], teacher1['id'], "Professeur ID mismatch in report.")
        self.assertEqual(len(retrieved_report['report_catalogues']), 2, "Expected two catalogues in the report.")

        updated_report = self.update_report_with_max_scores(retrieved_report,score_rule_point)
        debug_print("json_data_updated_fullreport = ", updated_report)
        # Step 9: Update Report (new score , new label : immer max point)
        response = self.api_util._update_fullreport(updated_report) 
        debug_print("#######################################") 
        debug_print("_update_fullreport after setting maximum score  response.data", response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Update Report failed: {response.status_code} - {response.content}")

        # Step 10: Get Report and Validate update 
        # Retrieve the updated report
        response = self.api_util._get_fullreport(report_id)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Get updated Report failed: {response.status_code} - {response.content}")
        updated_report = response.data

        # Assertions to ensure the report was updated correctly
        for report_catalogue in updated_report['report_catalogues']:
            for resultat in report_catalogue['resultats']:
                # Ensure score and seuils are updated properly (>= 0)
                self.assertGreaterEqual(resultat['score'], 0, "Expected Resultat score to be >= 0 after update.")
                self.assertGreaterEqual(resultat['seuil1_percent'], 0, "Expected seuil1_percent to be calculated after update.")
                self.assertGreaterEqual(resultat['seuil2_percent'], 0, "Expected seuil2_percent to be calculated after update.")
                self.assertGreaterEqual(resultat['seuil3_percent'], 0, "Expected seuil3_percent to be calculated after update.")

                for resultat_detail in resultat['resultat_details']:
                    # Ensure ResultatDetail score is updated and valid
                    self.assertGreaterEqual(resultat_detail['score'], 0, "Expected ResultatDetail score to be >= 0 after update.")
                    self.assertNotEqual(resultat_detail['scorelabel'], '?', "Expected ResultatDetail scorelabel to be updated from '?'.")
                    self.assertNotEqual(resultat_detail['observation'], '', "Expected ResultatDetail observation to be updated.")


        # Step 11: Check all Eleve Reports 
        response = self.api_util._get_eleve_report(eleve1['id'])
        debug_print("_get_eleve_report  response.data", response.data) 
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Get Eleve report failed: {response.status_code} - {response.content}")
        report_list = response.data
        self.assertGreater(len(report_list), 0, "Expected at least one report for the Eleve after creation.")


        # make a report to eleve2 by teacher1
        debug_print("Creating report with eleve_id:", eleve2['id'])
        response = self.api_util._create_fullreport(
            eleve_id=eleve2['id'], 
            professeur_id=teacher1['id'], 
            pdflayout_id=pdflayout_id, 
            catalogue_ids=catalogue_ids
        ) 


        # Assertions after the fullreport creation ################################
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Create Report failed: {response.status_code} - {response.content}")
        report_data = response.data
        self.assertIn("eleve", report_data)
        self.assertEqual(report_data['eleve'], eleve2['id'])
        report2 = report_data  # Get the newly created report ID



        #############################################################################
        # Additional steps to test report retrieval with another teacher
 

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {teachertest2_token}')

        # Attempt to get reports as the second teacher   (eleve1 is not a student of teacher2)
        response = self.api_util._get_eleve_report(eleve1['id'])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN, f"Get Eleve report by second teacher failed: {response.status_code} - {response.content}")
 


        # Attempt to get reports as the second teacher   (eleve2 is   a student of teacher2)
        response = self.api_util._get_eleve_report(eleve2['id'])
        report_data = response.data 
        debug_print(" second teacher view report for eleve_id:", eleve2['id'])
        debug_print(report_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK, f"Get Eleve report by second teacher failed: {response.status_code} - {response.content}")

        self.assertEqual(len(report_data), 1 )
        self.assertEqual(report_data[0]['eleve'], eleve2['id'])
        self.assertEqual(report_data[0]['id'],report2['id'])
        

        # make a report to eleve2 by teacher2
        debug_print("Creating report with eleve_id:", eleve2['id'])
        response = self.api_util._create_fullreport(
            eleve_id=eleve2['id'], 
            professeur_id=teacher2['id'], 
            pdflayout_id=pdflayout_id, 
            catalogue_ids=catalogue_ids
        )  
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, f"Create Report failed: {response.status_code} - {response.content}")
        report_data = response.data
        self.assertIn("eleve", report_data)
        self.assertEqual(report_data['eleve'], eleve2['id'])
        report2 = report_data  # Get the newly created report ID

        ########### must check get_fullreport_list .....must be also 

    # last methode to see statistiques with zzz so that it is executed and printed at the end
    def test_zzz_print_test_statistique(self):
        # Output the call counts
        print("Call count of all tested API")
        print(self.api_util.get_call_counts())  # Display the counts for debugging


  