export interface Row {
  row_id: number;
  short_name: string;
  name: string;
  nb_plant: number;
  fruit_id: number;     // from source='fruit.id'
  fruit_type: string;   // from source='fruit.name'
  // We enrich this client-side when reading /locations/
  field_id?: number;
}
