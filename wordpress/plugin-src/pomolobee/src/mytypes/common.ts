// Generic helpers you can reuse
export type DateString = string;        // "YYYY-MM-DD"
export type DateTimeString = string;    // "YYYY-MM-DDTHH:mm:ss"

// API often returns relative URLs (e.g. "/media/foo.jpg" or null)
export type RelativeUrl = string | null;
