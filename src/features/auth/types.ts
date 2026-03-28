export type AppRole = "owner" | "operator";

export interface AppSessionUser {
  id: string;
  email: string;
  role: AppRole;
}

export interface AppSessionPayload extends AppSessionUser {
  iat: number;
  exp: number;
}

export interface AppAuthSetupState {
  configured: boolean;
  baseUrlConfigured: boolean;
  missingFields: string[];
  ownerEmail: string | null;
}
