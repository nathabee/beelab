import { DateString } from "./common";

export interface Fruit {
  fruit_id: number;
  short_name: string;
  name: string;
  description: string;
  yield_start_date: DateString | null; // serializer allows null by default unless model forbids
  yield_end_date: DateString | null;
  yield_avg_kg: number | null;
  fruit_avg_kg: number | null;
}
