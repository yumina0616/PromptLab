import { apiClient, publicApiClient } from './client';
import type {
  PromptCreatePayload,
  PromptCreateResponse,
  PromptListQuery,
  PromptListResponse,
  PromptDetail,
  PromptUpdatePayload,
  PromptUpdateResponse,
  PromptVersionListQuery,
  PromptVersionListResponse,
  PromptVersionCreatePayload,
  PromptVersion,
  PromptVersionUpdatePayload,
  PromptModelSetting,
  PromptModelSettingUpdateResponse,
  PromptTagsResponse,
  PromptCategoriesResponse,
  PromptModelSettingPatch,
  PromptFavoriteResponse,
  PromptCommentListResponse,
  PromptComment,
} from '@/types/prompt';

interface PromptListOptions {
  publicAccess?: boolean;
}

export const createPrompt = async (
  payload: PromptCreatePayload
): Promise<PromptCreateResponse> => {
  const response = await apiClient.post<PromptCreateResponse>('/prompts', payload);
  return response.data;
};

export const listPrompts = async (
  params?: PromptListQuery,
  options?: PromptListOptions
): Promise<PromptListResponse> => {
  const client = options?.publicAccess ? publicApiClient : apiClient;
  const response = await client.get<PromptListResponse>('/prompts', { params });
  return response.data;
};

export const getPrompt = async (id: number): Promise<PromptDetail> => {
  const response = await apiClient.get<PromptDetail>(`/prompts/${id}`);
  return response.data;
};

export const updatePrompt = async (
  id: number,
  payload: PromptUpdatePayload
): Promise<PromptUpdateResponse> => {
  const response = await apiClient.patch<PromptUpdateResponse>(`/prompts/${id}`, payload);
  return response.data;
};

export const deletePrompt = async (id: number): Promise<void> => {
  await apiClient.delete(`/prompts/${id}`);
};

export const listPromptVersions = async (
  promptId: number,
  params?: PromptVersionListQuery
): Promise<PromptVersionListResponse> => {
  const response = await apiClient.get<PromptVersionListResponse>(
    `/prompts/${promptId}/versions`,
    { params }
  );
  return response.data;
};

export const createPromptVersion = async (
  promptId: number,
  payload: PromptVersionCreatePayload
): Promise<PromptVersion> => {
  const response = await apiClient.post<PromptVersion>(`/prompts/${promptId}/versions`, payload);
  return response.data;
};

export const getPromptVersion = async (
  promptId: number,
  versionId: number
): Promise<PromptVersion> => {
  const response = await apiClient.get<PromptVersion>(
    `/prompts/${promptId}/versions/${versionId}`
  );
  return response.data;
};

export const updatePromptVersion = async (
  promptId: number,
  versionId: number,
  payload: PromptVersionUpdatePayload
): Promise<PromptVersion> => {
  const response = await apiClient.patch<PromptVersion>(
    `/prompts/${promptId}/versions/${versionId}`,
    payload
  );
  return response.data;
};

export const deletePromptVersion = async (promptId: number, versionId: number): Promise<void> => {
  await apiClient.delete(`/prompts/${promptId}/versions/${versionId}`);
};

export const getPromptModelSetting = async (
  promptId: number,
  versionId: number
): Promise<PromptModelSetting> => {
  const response = await apiClient.get<PromptModelSetting>(
    `/prompts/${promptId}/versions/${versionId}/model-setting`
  );
  return response.data;
};

export const updatePromptModelSetting = async (
  promptId: number,
  versionId: number,
  payload: PromptModelSettingPatch
): Promise<PromptModelSettingUpdateResponse> => {
  const response = await apiClient.patch<PromptModelSettingUpdateResponse>(
    `/prompts/${promptId}/versions/${versionId}/model-setting`,
    payload
  );
  return response.data;
};

export const listPromptTags = async (q?: string): Promise<PromptTagsResponse> => {
  const response = await apiClient.get<PromptTagsResponse>('/prompts/tags', {
    params: q ? { q } : undefined,
  });
  return response.data;
};

export const listPromptCategories = async (): Promise<PromptCategoriesResponse> => {
  const response = await apiClient.get<PromptCategoriesResponse>('/prompts/categories');
  return response.data;
};

export const addPromptFavorite = async (
  promptId: number,
  versionId: number
): Promise<PromptFavoriteResponse> => {
  const response = await apiClient.post<PromptFavoriteResponse>(
    `/prompts/${promptId}/versions/${versionId}/favorite`
  );
  return response.data;
};

export const removePromptFavorite = async (promptId: number, versionId: number): Promise<void> => {
  await apiClient.delete(`/prompts/${promptId}/versions/${versionId}/favorite`);
};

export const listPromptComments = async (
  promptId: number,
  versionId: number
): Promise<PromptCommentListResponse> => {
  const response = await apiClient.get<PromptCommentListResponse>(
    `/prompts/${promptId}/versions/${versionId}/comments`
  );
  return response.data;
};

export const createPromptComment = async (
  promptId: number,
  versionId: number,
  body: string
): Promise<PromptComment> => {
  const response = await apiClient.post<PromptComment>(
    `/prompts/${promptId}/versions/${versionId}/comments`,
    { body }
  );
  return response.data;
};

export const deletePromptComment = async (
  promptId: number,
  versionId: number,
  commentId: number
): Promise<void> => {
  await apiClient.delete(`/prompts/${promptId}/versions/${versionId}/comments/${commentId}`);
};
