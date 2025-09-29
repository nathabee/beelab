// src/types/user.ts


// shared component

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    lang: string;
    roles: string[];
    // new:
    is_demo?: boolean;
    demo_expires_at?: string | null;
  }
   