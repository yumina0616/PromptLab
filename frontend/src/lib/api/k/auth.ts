import { apiClient } from './client';
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  SessionResponse,
} from '@/types/auth';
import type { UserProfile } from '@/types/user';

// 회원가입
export const register = async (data: RegisterRequest): Promise<RegisterResponse> => {
  const response = await apiClient.post<RegisterResponse>('/auth/register', data);
  return response.data;
};

// 로그인
export const login = async (data: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/auth/login', data);
  return response.data;
};

// 로그아웃
export const logout = async (): Promise<void> => {
  await apiClient.post('/auth/logout');
};

// 토큰 재발급
export const refreshToken = async (): Promise<RefreshResponse> => {
  const response = await apiClient.post<RefreshResponse>('/auth/refresh');
  return response.data;
};

// 내 정보 조회
export const getMe = async (): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>('/auth/me');
  return response.data;
};

// 비밀번호 변경
export const changePassword = async (data: ChangePasswordRequest): Promise<void> => {
  await apiClient.post('/auth/password/change', data);
};

// 비밀번호 재설정 요청
export const requestPasswordReset = async (data: PasswordResetRequest): Promise<void> => {
  await apiClient.post('/auth/password/reset/request', data);
};

// 비밀번호 재설정 확인
export const confirmPasswordReset = async (data: PasswordResetConfirmRequest): Promise<void> => {
  await apiClient.post('/auth/password/reset/confirm', data);
};

// 세션 확인
export const checkSession = async (): Promise<SessionResponse> => {
  const response = await apiClient.get<SessionResponse>('/auth/session');
  return response.data;
};
