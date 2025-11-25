// 프로필

export interface ProfileSettings {
  userid: string;
  display_name: string;
  profile_image_url: string | null;
  bio: string;
  email: string;  
}

export interface UpdateProfileRequest {
  userid?: string;
  display_name?: string;
  profile_image_url?: string | null;
  bio?: string;
}

export interface UpdateProfileResponse {
  updated: boolean;
}

// 프라이버시

export interface PrivacySettings {
  is_profile_public: boolean;
  show_email: boolean;
  show_activity_status: boolean;
  default_prompt_visibility: 'public' | 'private' | 'unlisted';
}

export interface UpdatePrivacyRequest {
  is_profile_public?: boolean;
  show_email?: boolean;
  show_activity_status?: boolean;
  default_prompt_visibility?: 'public' | 'private' | 'unlisted';
}

export interface UpdatePrivacyResponse {
  updated: boolean;
}

// 환경

export interface EnvironmentSettings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  timezone: string;
}

export interface UpdateEnvironmentRequest {
  theme?: 'dark' | 'light' | 'system';
  language?: string;
  timezone?: string;
}

export interface UpdateEnvironmentResponse {
  updated: boolean;
}

// 이메일 변경

export interface EmailChangeRequest {
  new_email: string;
}

export interface EmailChangeRequestResponse {
  sent: boolean;
}

export interface EmailChangeConfirmRequest {
  token: string;
}

export interface EmailChangeConfirmResponse {
  changed: boolean;
}

// 에러 코드

export type SettingsErrorCode =
  | 'USERID_TAKEN'
  | 'INVALID_FIELD'
  | 'EMAIL_TAKEN'
  | 'INVALID_EMAIL'
  | 'TOO_MANY_REQUESTS'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED';
