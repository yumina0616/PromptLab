// Auth API 타입 정의

// 사용자 정보
export interface User {
  id: number;
  email: string;
  userid: string;
  display_name: string;
  profile_image_url?: string | null;
  theme?: 'system' | 'light' | 'dark';
  language?: string;
  timezone?: string;
  default_prompt_visibility?: 'public' | 'unlisted' | 'private';
}

// 회원가입 요청
export interface RegisterRequest {
  email: string;
  password: string;
  userid: string;
  display_name: string;
}

// 회원가입 응답
export interface RegisterResponse {
  user: User;
  access_token: string;
  expires_in: number;
}

// 로그인 요청
export interface LoginRequest {
  email: string;
  password: string;
}

// 로그인 응답
export interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: User;
}

// 토큰 재발급 요청
export interface RefreshRequest {
  refresh_token: string;
}

// 토큰 재발급 응답
export interface RefreshResponse {
  access_token: string;
  expires_in: number;
}

// API 에러 응답
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// 에러 코드 타입
export type AuthErrorCode =
  | 'EMAIL_TAKEN'
  | 'USERID_TAKEN'
  | 'WEAK_PASSWORD'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'EXPIRED_REFRESH_TOKEN'
  | 'UNAUTHORIZED';

// 비밀번호 변경 요청
export interface ChangePasswordRequest {
  current_password: string;  
  new_password: string;      
}

// 비밀번호 재설정 요청
export interface PasswordResetRequest {
  email: string;
}

// 비밀번호 재설정 확인
export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

// 세션 체크 응답
export interface SessionResponse {
  authenticated: boolean;
  expires_in: number;
}
