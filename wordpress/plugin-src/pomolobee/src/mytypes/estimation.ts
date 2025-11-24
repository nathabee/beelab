import { DateString, DateTimeString } from "./common";

// If you know the exact display values for Estimation.source, make a literal union instead of string.
export type EstimationSource = string;

export interface Estimation {
  estimation_id: number;
  image_id: number | null;
  date: DateString | null;
  timestamp: DateTimeString;
  row_id: number;
  row_name: string;
  field_id: number;
  field_name: string;
  fruit_type: string;
  plant_kg: number | null;   // depends on model; serializer lists it, so include as number|null
  row_kg: number | null;
  maturation_grade: number | null;
  confidence_score: number;  // serializer declares FloatField (required)
  source: EstimationSource;  // from get_source_display
  fruit_plant: number;       // required per serializer
  status: string;            // taken from related image.status if present, else "unknown"
}
