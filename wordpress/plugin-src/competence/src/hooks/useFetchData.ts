'use client';
// src/hooks/useFetchData.ts

// shared component
// use client is needed by nextjs (useeeffect...) but will be ignored by wordpress



import { useApp } from '@context/AuthContext';
import { getToken , isTokenExpired } from '@utils/jwt'; 
import axios from 'axios';
import { ScoreRulePoint  } from '@mytypes/report';
// import { getApiUrl } from '@utils/helper';
import { apiApp, authHeaders } from '@utils/api';

const useFetchData = () => {
    const { catalogue, setCatalogue, layouts, setLayouts,  niveaux, setNiveaux,
        scoreRulePoints,  setScoreRulePoints
     } = useApp();

    const fetchData = async () => {
        const token = getToken ();
        //const time = new Date().toLocaleTimeString('de-DE', { hour12: false });

        //console.log("fetchData time",time);

        if (!token || isTokenExpired(token)) {
            console.log("fetchData token expired out");
            return; // Handle token validation as needed
        }

        //const apiUrl = getApiUrl();


        try {
            //console.log("fetchData tgoing to init catalogue layouts");

            // Fetch Catalogues only if they are not already set
            if (catalogue.length === 0) {
 
                const response = await apiApp.get('/catalogues/',  { headers: authHeaders(token) });
                //console.log('useFetchData catalogue:', response.data);
                //console.log('useFetchData catalogue');
                setCatalogue(response.data);
            }

            if (layouts.length === 0) {
                const layoutsResponse  = await apiApp.get('/pdf_layouts/',   { headers: authHeaders(token) });
 
                //console.log("get layoutsResponse ", layoutsResponse.data)
                //console.log('useFetchData layouts');
                setLayouts(layoutsResponse.data);
            }


            // Fetch Niveaux and store them in context/localStorage
            if (!niveaux || niveaux.length === 0) {
                const niveauResponse  = await apiApp.get('/niveaux/',    { headers: authHeaders(token) });
                //console.log("get niveauResponse ", niveauResponse.data)
                //console.log('useFetchData niveaux');
                setNiveaux(niveauResponse.data); // Save in AuthContext and localStorage
            }


            if (!scoreRulePoints || scoreRulePoints.length === 0) {
                const scoreRuleResponse = await apiApp.get<ScoreRulePoint[]>(`/scorerulepoints/`,  { headers: authHeaders(token) });
                //console.log('Fetched scoreRuleResponse:', scoreRuleResponse.data);
                //console.log('useFetchData scoreRulePoints');
                setScoreRulePoints(scoreRuleResponse.data);
            }

        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    return { fetchData }; // Return the fetch function
};

export default useFetchData;
