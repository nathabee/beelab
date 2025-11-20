// types/info.ts

// data are mirorring the JSON REST api
// in this example we use the interface api/user/hello

import { User } from '@bee/common';

// types/info.ts
// Canonical TypeScript model for Django /api/info/ endpoint
// All interfaces are “Info*” prefixed

// ---------------------------------------------
// Top-level information object
// ---------------------------------------------
export interface InfoResponse {
  service: string;
  timestamp: string;            // ISO datetime string
  environment: 'dev' | 'prod';  // from Django DEBUG flag
  apps: InfoApp[];
  auth: InfoAuth;
  users: InfoUsers;
}

// ---------------------------------------------
// Application entry (list of installed project apps)
// ---------------------------------------------
export interface InfoApp {
  label: string;  // e.g. "usercore"
  name: string;   // e.g. "UserCore"
}

// ---------------------------------------------
// Authentication metadata
// ---------------------------------------------
export interface InfoAuth {
  roles: string[];  // only safe public roles (demo, teacher, farmer, etc.)
}

// ---------------------------------------------
// User statistics block
// ---------------------------------------------
export interface InfoUsers {
  total: number;
  demo_active: number;
  by_language: InfoLanguageStat[];
}

// ---------------------------------------------
// Per-language user count item
// ---------------------------------------------
export interface InfoLanguageStat {
  lang: string;   // "en" | "fr" | "de" | "bz" | ...
  count: number;
}

// ----------------------
// /api/me/ payload
// ----------------------
export interface InfoMe {
  id: number;
  username: string;
  email: string;
  lang: string;
  is_demo: boolean;
  roles: string[];
  demo_expires_at: string | null;
}