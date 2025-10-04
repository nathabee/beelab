// shared/user/types.ts
 

export interface User {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    lang: string;
    roles: string[];
    is_demo?: boolean;
    demo_expires_at?: string | null;
  }
   