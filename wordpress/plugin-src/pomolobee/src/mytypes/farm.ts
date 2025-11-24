import { FieldBasic } from "./field";

export interface FarmWithFields {
  farm_id: number;
  name: string;
  fields: FieldBasic[];
}
