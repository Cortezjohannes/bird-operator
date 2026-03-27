export interface ProfileRevision {
  id: string;
  name: string;
  bio: string;
  url: string;
  location: string;
  avatar_asset_ref: string | null;
  banner_asset_ref: string | null;
  created_at: string;
  applied_at: string | null;
}

export interface ProfileState {
  currentDraftRevisionId: string | null;
  currentAppliedRevisionId: string | null;
}

export interface ProfileDraftPayload {
  name: string;
  bio: string;
  url: string;
  location: string;
  avatar_asset_ref?: string | null;
  banner_asset_ref?: string | null;
}
