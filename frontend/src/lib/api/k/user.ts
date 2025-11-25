import { apiClient } from './client';
import type {
  UserProfile,
  UpdateProfileRequest,
  UserPromptsResponse,
  UserFavoritesResponse,
  UserForksResponse,
  UserActivityResponse,
  ExportJobResponse,
  RequestAccountDeletionResponse,
  DeleteAccountRequest,
  DeleteAccountResponse,
} from '@/types/user';

// 사용자 프로필 조회 (본인 또는 다른 사람)
export const getProfile = async (userid: string): Promise<UserProfile> => {
  const response = await apiClient.get<UserProfile>(`/users/${userid}`);
  return response.data;
};

// 사용자 프로필 수정
export const updateProfile = async (
  userid: string,
  data: UpdateProfileRequest
): Promise<UserProfile> => {
  const response = await apiClient.patch<UserProfile>(`/users/${userid}`, data);
  return response.data;
};

//사용자 프롬프트 목록 조회
export const getUserPrompts = async (
  userid: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'popular' | 'oldest';
    visibility?: 'public' | 'unlisted' | 'private';
  }
): Promise<UserPromptsResponse> => {
  const response = await apiClient.get<UserPromptsResponse>(`/users/${userid}/prompts`, {
    params,
  });
  return response.data;
};

// 사용자 즐겨찾기 목록 조회
export const getUserFavorites = async (
  userid: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'popular' | 'oldest';
  }
): Promise<UserFavoritesResponse> => {
  const response = await apiClient.get<UserFavoritesResponse>(`/users/${userid}/favorites`, {
    params,
  });
  return response.data;
};

// 사용자 포크 목록 조회
export const getUserForks = async (
  userid: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'popular' | 'oldest';
  }
): Promise<UserForksResponse> => {
  const response = await apiClient.get<UserForksResponse>(`/users/${userid}/forks`, {
    params,
  });
  return response.data;
};

// 사용자 활동 로그 조회
export const getUserActivity = async (
  userid: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'oldest';
  }
): Promise<UserActivityResponse> => {
  const response = await apiClient.get<UserActivityResponse>(`/users/${userid}/activity`, {
    params,
  });
  return response.data;
};

// 사용자 데이터 내보내기
export const exportUserData = async (userid: string): Promise<ExportJobResponse> => {
  const response = await apiClient.get<ExportJobResponse>(`/users/${userid}/export`);
  return response.data;
};

// 계정 삭제 이메일 요청 (Step 1)
export const requestAccountDeletion = async (
  userid: string
): Promise<RequestAccountDeletionResponse> => {
  const response = await apiClient.post<RequestAccountDeletionResponse>(
    `/users/${userid}/delete-request`
  );
  return response.data;
};

// 계정 삭제 (Step 2)
export const deleteAccount = async (
  userid: string,
  data: DeleteAccountRequest
): Promise<DeleteAccountResponse> => {
  const response = await apiClient.delete<DeleteAccountResponse>(`/users/${userid}`, {
    data,
  });
  return response.data;
};
