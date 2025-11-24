import { DateString, DateTimeString, RelativeUrl } from "./common";

// If you know the exact choice values of Image.status, replace string below with a literal union:
// export type ImageStatus = "pending" | "processing" | "ready" | "failed";
export type ImageStatus = string; // from get_status_display()

export interface ImageItem {
  image_id: number;
  row_id: number;
  field_id: number;
  xy_location: string | null;        // serializer says read_only str; allow null if backend may send ""
  fruit_type: string;
  user_fruit_plant: number | null;
  upload_date: DateString | null;
  date: DateString | null;
  image_url: RelativeUrl;            // relative or null
  original_filename: string | null;
  processed: boolean;
  processed_at: DateTimeString | null;
  status: ImageStatus;
}

// For MLStatusSerializer (simplified)
export interface MLStatus {
  image_id: number;
  processed: boolean;
}
