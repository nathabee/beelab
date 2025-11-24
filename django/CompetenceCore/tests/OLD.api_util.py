from rest_framework.test import APIClient

class ApiUtil:
    call_counts = {
        "delete_user": 0,
        "get_user": 0,
        "get_user_roles" : 0,
        "get_user_me": 0,
        "get_teacher_list": 0,
        "create_user": 0,
        "login_user": 0,
        "get_user_list": 0,
        "get_eleve_list": 0,
        "get_eleve": 0,
        "delete_eleve": 0,    
        "create_eleve":0,
        "create_niveau": 0,
        "get_niveau": 0,
        "get_niveau_list": 0,
        "create_etape": 0,
        "get_etape": 0,     
        "get_etape_list": 0,       
        "create_annee": 0,
        "get_annee": 0,
        "get_annee_list": 0,
        "create_matiere": 0,
        "get_matiere": 0, 
        "get_matiere_list": 0, 
        "create_pdf_layout": 0,
        "get_pdf_layout": 0,
        "get_pdf_layout_list": 0, 
        "get_eleve_report": 0,
        "create_report": 0,
        "create_full_report":0,
        "get_report": 0,
        "get_report_list": 0,
        "create_report_catalogue": 0,
        "get_report_catalogue": 0,
        "get_report_catalogue_list": 0,
        "create_resultat": 0,
        "get_resultat": 0,
        "get_resultat_eleve": 0,
        "get_resultat_list": 0,
        "create_resultat_detail": 0,
        "get_resultat_detail": 0,
        "get_resultat_detail_list": 0,
        "create_score_rule_point": 0,
        "get_score_rule_point": 0,
        "get_score_rule_point_list": 0, 
        "create_catalogue": 0,
        "get_catalogue": 0,
        "get_catalogue_list": 0,
        "create_groupagedata": 0,
        "get_groupagedata": 0,
        "get_groupagedata_list": 0,
        "get_groupagedata_catalogue": 0,
        "create_item": 0,
        "get_item": 0,
        "get_item_list": 0,
        "get_item_groupagedata": 0,
        "create_fullreport": 0,
        "get_fullreport": 0,
        "get_fullreport_list": 0,
        "update_fullreport": 0,
    }

    def __init__(self, client: APIClient):
        self.client = client

    def _delete_user(self, user_id):
        self.call_counts["delete_user"] += 1
        return self.client.delete(f"/api/users/{user_id}/")

    def _get_user(self, user_id):
        self.call_counts["get_user"] += 1
        return self.client.get(f"/api/users/{user_id}/")



    def _get_user_list(self):
        self.call_counts["get_user_list"] += 1
        return self.client.get(f"/api/users/")

    def _get_teacher_list(self):
        self.call_counts["get_teacher_list"] += 1
        return self.client.get(f"/api/users/teacher_list/")

 


    def _get_user_me(self):
        self.call_counts["get_user_me"] += 1
        return self.client.get(f"/api/users/me/")


    def _get_user_roles(self):  #all the roles of the authentificated user
        self.call_counts["get_user_roles"] += 1
        return self.client.get(f"/api/user/roles/")


    def _create_user(self, username, password, first_name, last_name, roles):
        self.call_counts["create_user"] += 1
        data = {
            'username': username,
            'password': password,
            'first_name': first_name,
            'last_name': last_name,
            'roles': roles
        }
        return self.client.post('/api/users/', data, format='json')

    def _login_user(self,username,userpassword):
        self.call_counts["login_user"] += 1
        data = {
            'username': username,
            'password': userpassword
        }
        return self.client.post('/api/token/', data, format='json') 


    def _create_eleve(self, nom, prenom, niveau, datenaissance, professeurs):
        self.call_counts["create_eleve"] += 1
        data = {
                "nom": nom,
                "prenom": prenom,
                "niveau": niveau,
                "datenaissance": datenaissance,
                "professeurs": professeurs
        }
        return self.client.post('/api/eleves/', data, format='json')

 
    
    def _get_eleve_list(self):   # all eleves of the user teacher
        self.call_counts["get_eleve_list"] += 1
        return self.client.get(f"/api/eleves/")

 
 
    def _delete_eleve(self,  eleve_id):
        self.call_counts["delete_eleve"] += 1
        return self.client.delete(f"/api/eleves/{eleve_id}/")
 
    def _get_eleve(self,  eleve_id):
        self.call_counts["get_eleve"] += 1
        return self.client.get(f"/api/eleves/{eleve_id}/")
 
    def _create_niveau(self,  niveau, description):
        self.call_counts["create_niveau"] += 1
        data = {
            "niveau": niveau,
            "description": description
        }
        return self.client.post("/api/niveaux/", data, format='json')
 
 
    def _get_niveau_list(self):
        self.call_counts["get_niveau_list"] += 1
        return self.client.get(f"/api/niveaux/")
    

    def _get_niveau(self,  niveau_id):
        self.call_counts["get_niveau"] += 1
        return self.client.get(f"/api/niveaux/{niveau_id}/")


    # Etape-related methods 
    def _create_etape(self,  etape, description):
        self.call_counts["create_etape"] += 1
        data = {
            "etape": etape,
            "description": description
        }
        return self.client.post("/api/etapes/", data, format='json')
 
    def _get_etape(self,  etape_id):
        self.call_counts["get_etape"] += 1
        return self.client.get(f"/api/etapes/{etape_id}/")


    def _get_etape_list(self):
        self.call_counts["get_etape_list"] += 1
        return self.client.get(f"/api/etapes/")
    
    # Annee-related methods
    def _create_annee(self, is_active, start_date, stop_date, description):
        self.call_counts["create_annee"] += 1
        
        data = {
            "is_active": is_active,
            "description": description
        }

        if start_date:
            data["start_date"] = start_date
        
        if stop_date:
            data["stop_date"] = stop_date

        #print(f"POST /api/annees/", data)
        return self.client.post("/api/annees/", data, format='json')

 
    def _get_annee(self,  annee_id):
        self.call_counts["get_annee"] += 1
        return self.client.get(f"/api/annees/{annee_id}/")


    def _get_annee_list(self):
        self.call_counts["get_annee_list"] += 1
        return self.client.get(f"/api/annees/")

    # Matiere-related methods 
    def _create_matiere(self,  matiere, description):
        self.call_counts["create_matiere"] += 1
        data = {
            "matiere": matiere,
            "description": description
        }
        return self.client.post("/api/matieres/", data, format='json')
 
 

    def _get_matiere(self, matiere_id):
        self.call_counts["get_matiere"] += 1
        return self.client.get(f"/api/matieres/{matiere_id}/")

    def _get_matiere_list(self):
        self.call_counts["get_matiere_list"] += 1
        return self.client.get(f"/api/matieres/")



    # ScoreRulePoint API Calls
    def _create_score_rule_point(self, scorelabel, score, description):
        self.call_counts["create_score_rule_point"] += 1
        data = {
            "scorelabel": scorelabel,
            "score": score,
            "description": description
        }
        return self.client.post("/api/scorerulepoints/", data, format='json')

    def _get_score_rule_point(self, score_rule_point_id):
        self.call_counts["get_score_rule_point"] += 1
        return self.client.get(f"/api/scorerulepoints/{score_rule_point_id}/")

    def _get_score_rule_point_list(self):
        self.call_counts["get_score_rule_point_list"] += 1
        return self.client.get("/api/scorerulepoints/")



    def _create_pdf_layout(self, header_icon, footer_message):
        self.call_counts["create_pdf_layout"] += 1
        data = {
            "header_icon": header_icon,
            "footer_message": footer_message
        }
        return self.client.post("/api/pdf_layouts/", data, format='json')

    def _get_pdf_layout(self, pdf_layout_id):
        self.call_counts["get_pdf_layout"] += 1
        return self.client.get(f"/api/pdf_layouts/{pdf_layout_id}/")

    def _get_pdf_layout_list(self):
        self.call_counts["get_pdf_layout_list"] += 1
        return self.client.get("/api/pdf_layouts/")
    

    def _create_fullreport(self, data):
        self.call_counts["create_full_report"] += 1 
        return self.client.post("/api/full-reports/", data, format='json')

 

    def _get_eleve_report(self, eleve_id):
        self.call_counts["get_eleve_report"] += 1
        return self.client.get("/api/eleve/{}/reports/".format(eleve_id))
    
 
        
    def _create_report(self, eleve_id, professeur_id, pdflayout_id, report_catalogues):
        self.call_counts["create_report"] += 1
        data = {
            "eleve": eleve_id,
            "professeur": professeur_id,
            "pdflayout": pdflayout_id,
            "report_catalogues": report_catalogues
        }
        #print("Data sent to create report:", data)   
        return self.client.post("/api/reports/", data, format='json')


    def _get_report(self, report_id):
        self.call_counts["get_report"] += 1
        return self.client.get(f"/api/reports/{report_id}/")

    def _get_report_list(self):
        self.call_counts["get_report_list"] += 1
        return self.client.get("/api/reports/")
    
    def _create_report_catalogue(self, report_id, catalogue_id):
        self.call_counts["create_report_catalogue"] += 1
        data = {
            "report": report_id,
            "catalogue": catalogue_id   
        }
        return self.client.post("/api/reportcatalogues/", data, format='json')


    def _get_report_catalogue(self, report_catalogue_id):
        self.call_counts["get_report_catalogue"] += 1
        return self.client.get(f"/api/reportcatalogues/{report_catalogue_id}/")

    def _get_report_catalogue_list(self):
        self.call_counts["get_report_catalogue_list"] += 1
        return self.client.get("/api/reportcatalogues/")
 

    def _create_resultat(self, report_catalogue_id, groupage_id, score, seuil1_percent, seuil2_percent, seuil3_percent):
        self.call_counts["create_resultat"] += 1
        data = {
            "report_catalogue": report_catalogue_id,
            "groupage": groupage_id,   
            "score": score,
            "seuil1_percent": seuil1_percent,
            "seuil2_percent": seuil2_percent,
            "seuil3_percent": seuil3_percent
        }
        #print(f"DEBUG _create_resultat",data)
        return self.client.post("/api/resultats/", data, format='json')


    def _get_resultat(self, resultat_id):
        self.call_counts["get_resultat"] += 1
        return self.client.get(f"/api/resultats/{resultat_id}/")


    def _get_resultat_eleve(self, eleve_id):
        self.call_counts["get_resultat_eleve"] += 1
        return self.client.get(f"/api/resultats/?eleve_id={eleve_id}/")
 


    def _get_resultat_list(self):
        self.call_counts["get_resultat_list"] += 1
        return self.client.get("/api/resultats/")

    # Resultat Detail API Calls
    def _create_resultat_detail(self, resultat_id, item_id, score, scorelabel=None, observation=None):
        self.call_counts["create_resultat_detail"] += 1
        data = {
            "resultat_id": resultat_id,
            "item_id": item_id,
            "score": score,
            "scorelabel": scorelabel,
            "observation": observation
        }
        #print(f"post /api/resultatdetails/", data)
        return self.client.post("/api/resultatdetails/", data, format='json')
 


    def _get_resultat_detail(self, resultat_detail_id):
        self.call_counts["get_resultat_detail"] += 1
        return self.client.get(f"/api/resultatdetails/{resultat_detail_id}/")

    def _get_resultat_detail_list(self):
        self.call_counts["get_resultat_detail_list"] += 1
        return self.client.get("/api/resultatdetails/")

    # Catalogue API Calls
    def _create_catalogue(self, niveau_id, etape_id, annee_id, matiere_id, description):
        self.call_counts["create_catalogue"] += 1
        data = {
            "niveau_id": niveau_id,
            "etape_id": etape_id,
            "annee_id": annee_id,
            "matiere_id": matiere_id,
            "description": description
        }
        return self.client.post("/api/catalogues/", data, format='json')

    def _get_catalogue(self, catalogue_id):
        self.call_counts["get_catalogue"] += 1
        return self.client.get(f"/api/catalogues/{catalogue_id}/")

    def _get_catalogue_list(self):
        self.call_counts["get_catalogue_list"] += 1
        return self.client.get("/api/catalogues/")
    

 

    # GroupageData-related methods
    def _create_groupagedata(self, catalogue_id, position, desc_groupage, label_groupage, link, max_point, seuil1, seuil2, max_item):
        self.call_counts["create_groupagedata"] += 1
        data = {
            "catalogue": catalogue_id,
            "position": position,
            "desc_groupage": desc_groupage,
            "label_groupage": label_groupage,
            "link": link,
            "max_point": max_point,
            "seuil1": seuil1,
            "seuil2": seuil2,
            "max_item": max_item
        }
        return self.client.post("/api/groupages/", data, format='json')

 


    def _get_groupagedata_catalogue(self, catalogue_id):
        self.call_counts["get_groupagedata_catalogue"] += 1
        return self.client.get(f"/api/groupages/?catalogue={catalogue_id}")    

    def _get_groupagedata(self, groupagedata_id):
        self.call_counts["get_groupagedata"] += 1
        return self.client.get(f"/api/groupages/{groupagedata_id}/")

    def _get_groupagedata_list(self):
        self.call_counts["get_groupagedata_list"] += 1
        return self.client.get("/api/groupages/")

    # Item-related methods
    def _create_item(self, groupagedata_id, temps, description, observation, scorerule_id, max_score, itempos, link):
        self.call_counts["create_item"] += 1
        data = {
            "groupagedata": groupagedata_id,
            "temps": temps,
            "description": description,
            "observation": observation,
            "scorerule": scorerule_id,
            "max_score": max_score,
            "itempos": itempos,
            "link": link
        }
        return self.client.post("/api/items/", data, format='json')
 
    def _get_item_groupagedata(self, groupagedata_id):
        self.call_counts["get_item_groupagedata"] += 1
        return self.client.get(f"/api/items/?groupagedata={groupagedata_id}")    
 


    def _get_item(self, item_id):
        self.call_counts["get_item"] += 1
        return self.client.get(f"/api/items/{item_id}/")

    def _get_item_list(self):
        self.call_counts["get_item_list"] += 1
        return self.client.get("/api/items/")
 

    def _create_fullreport(self, eleve_id, professeur_id, pdflayout_id,catalogue_ids):  # report_catalogues,
        """Create a new full report."""
        self.call_counts["create_fullreport"] += 1
        data = {
            "eleve": eleve_id,
            "professeur": professeur_id,
            "pdflayout": pdflayout_id,
            "catalogue_ids":catalogue_ids,
            #"report_catalogues": report_catalogues,
        }
        return self.client.post("/api/fullreports/", data, format='json')

    def _get_fullreport(self, report_id):
        """Retrieve a full report by ID."""
        self.call_counts["get_fullreport"] += 1
        return self.client.get(f"/api/fullreports/{report_id}/")


    def _update_fullreport(self, report):
        """Update an existing full report."""
        self.call_counts["update_fullreport"] += 1
        return self.client.patch(f"/api/fullreports/{report['id']}/", report, format='json')

    


    def _get_fullreport_list(self):
        """Retrieve the list of all full reports."""
        self.call_counts["get_fullreport_list"] += 1
        return self.client.get("/api/fullreports/")

###########################################################################

    def get_call_counts(self):
        # Filter counts to return only those greater than zero
        #return self.call_counts
        return {key: count for key, count in self.call_counts.items() if count > 0}