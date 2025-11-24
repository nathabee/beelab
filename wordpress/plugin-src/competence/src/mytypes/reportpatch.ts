
// src/types/reportpatch.ts
// used to make report patch api acess (update in delta)


// shared component


export interface ResultatDetailPatch {
    id: number;
    item_id: number;
    score: number;
    scorelabel: string;
    observation: string;
}

export interface ResultatPatch {
    id: number;
    resultat_details: ResultatDetailPatch[];
}

export interface ReportCataloguePatch {
    id: number;
    resultats: ResultatPatch[];
}

export interface ReportPatch {
    id: number;
    eleve: number;
    professeur: number;
    pdflayout: number;
    report_catalogues_data: ReportCataloguePatch[];
}
