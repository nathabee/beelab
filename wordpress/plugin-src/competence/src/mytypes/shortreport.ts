// src/types/shortreport.ts 


// shared component

export interface ShortProfesseur {
    last_name: string;
    first_name: string;
}


export interface ShortGroupageData {
    id: number;
    desc_groupage: string;
    label_groupage: string;
    position: number;
    max_point: number;
    seuil1: number;
    seuil2: number;
}

export interface ShortResultat {
    id: number;
    score: number;
    seuil1_percent: number;
    seuil2_percent: number;
    seuil3_percent: number;
    groupage: ShortGroupageData;  // Nested object for groupage
}

export interface ShortReportCatalogue {
    id: number;
    catalogue: string;  // Assuming catalogue is represented as a string
    resultats: ShortResultat[];  // Array of resultats
}

export interface ShortEleve {
    id: number;
    prenom: string;  
    nom: string; 
    niveau: string; 
}

export interface ShortReport {
    id: number;
    eleve: ShortEleve;   
    professeur: ShortProfesseur;  // Assuming this is the teacher's ID
    report_catalogues: ShortReportCatalogue[];  // Array of report catalogues
    created_at: string;  // Assuming ISO string format
    updated_at: string;  // Assuming ISO string format
}
