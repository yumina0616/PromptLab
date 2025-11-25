import { apiClient } from './client';
import type {
  ProfileSettings,
  UpdateProfileRequest,
  UpdateProfileResponse,
  PrivacySettings,
  UpdatePrivacyRequest,
  UpdatePrivacyResponse,
  EnvironmentSettings,
  UpdateEnvironmentRequest,
  UpdateEnvironmentResponse,
  EmailChangeRequest,
  EmailChangeRequestResponse,
  EmailChangeConfirmRequest,
  EmailChangeConfirmResponse,
} from '@/types/settings';

// 프로필

export const getProfileSettings = async (): Promise<ProfileSettings> => {
  const response = await apiClient.get<ProfileSettings>('/settings/profile');
  return response.data;
};

export const updateProfileSettings = async (
  data: UpdateProfileRequest
): Promise<UpdateProfileResponse> => {
  const response = await apiClient.patch<UpdateProfileResponse>('/settings/profile', data);
  return response.data;
};

// 프라이버시

export const getPrivacySettings = async (): Promise<PrivacySettings> => {
  const response = await apiClient.get<PrivacySettings>('/settings/privacy');
  return response.data;
};

export const updatePrivacySettings = async (
  data: UpdatePrivacyRequest
): Promise<UpdatePrivacyResponse> => {
  const response = await apiClient.patch<UpdatePrivacyResponse>('/settings/privacy', data);
  return response.data;
};

// 환경 (Environment)

export const getEnvironmentSettings = async (): Promise<EnvironmentSettings> => {
  const response = await apiClient.get<EnvironmentSettings>('/settings/environment');
  return response.data;
};

export const updateEnvironmentSettings = async (
  data: UpdateEnvironmentRequest
): Promise<UpdateEnvironmentResponse> => {
  const response = await apiClient.patch<UpdateEnvironmentResponse>('/settings/environment', data);
  return response.data;
};

// 이메일 변경

export const requestEmailChange = async (
  data: EmailChangeRequest
): Promise<EmailChangeRequestResponse> => {
  const response = await apiClient.post<EmailChangeRequestResponse>(
    '/settings/email/change-request',
    data
  );
  return response.data;
};

export const confirmEmailChange = async (
  data: EmailChangeConfirmRequest
): Promise<EmailChangeConfirmResponse> => {
  const response = await apiClient.post<EmailChangeConfirmResponse>(
    '/settings/email/change-confirm',
    data
  );
  return response.data;
};

// 세션/데이터 내보내기는 백엔드에 아직 구현되어 있지 않습니다.
