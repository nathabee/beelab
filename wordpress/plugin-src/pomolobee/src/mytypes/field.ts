import { RelativeUrl } from "./common";
import { Row } from "./row";


export interface FieldBasic {
  field_id: number;
  short_name: string;
  name: string;
  description: string;
}

export interface Field extends FieldBasic {
  orientation: string;
  svg_map_url: RelativeUrl;        // relative or null
  background_image_url: RelativeUrl; // relative or null
}

// Field + nested rows (FieldLocationSerializer)
//export interface FieldLocation {
//  field: Field;
//  rows: Row[];
//}


export interface FieldWithRows extends Field {
  rows: Row[];
}
