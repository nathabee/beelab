// src/types/pdf.ts

// shared component


export interface PDFLayout {
  id: number;
  //header_icon: string;     
  header_icon_base64: string;   
  schule_name: string;    
  header_message: string;    
  footer_message1: string;    
  footer_message2: string;
}


export interface ChartData {
  labels: string[];
  data: number[];
  labelImages: (string | ArrayBuffer | null)[];
  description: string;
}