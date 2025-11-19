// types/eleve.ts

// shared component

import { User } from '@bee/common';

export interface Niveau {
  id: number;
  niveau: string; // Short description of the level
  description: string; // Full description of the level
}

export interface Eleve {
  id: number; // or whatever the type is
  nom: string;
  prenom: string;
  niveau: number; //number; //  into number because of JTEST  will be the niveau_id
  niveau_description: string; // niveau.description associated to the eleve (  description) 
  datenaissance:  string; // Keeping this as a string to represent the date format (YYYY-MM-DD)
  // professeurs: number[]; // in comment because of JTEST Array of User IDs
  professeurs_details: User[]; // Array of serialized User objects
}

// Define the props for EleveSelection
export interface EleveSelectionProps {
  eleves: Eleve[];  
}