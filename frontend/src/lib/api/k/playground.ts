import { apiClient } from './client';
import type {
  PlaygroundRunRequest,
  PlaygroundRunResponse,
  PlaygroundGrammarCheckRequest,
  PlaygroundGrammarCheckResponse,
  PlaygroundHistoryQuery,
  PlaygroundHistoryListResponse,
  PlaygroundHistoryDetail,
  PlaygroundSaveRequest,
  PlaygroundSaveResponse,
  PlaygroundSettings,
  PlaygroundSettingsPatch,
  PlaygroundSettingsUpdateResponse,
} from '@/types/playground';

export const runPlayground = async (
  payload: PlaygroundRunRequest
): Promise<PlaygroundRunResponse> => {
  const response = await apiClient.post<PlaygroundRunResponse>('/playground/run', payload);
  return response.data;
};

export const grammarCheck = async (
  payload: PlaygroundGrammarCheckRequest
): Promise<PlaygroundGrammarCheckResponse> => {
  const response = await apiClient.post<PlaygroundGrammarCheckResponse>(
    '/playground/grammar-check',
    payload
  );
  return response.data;
};

export const listPlaygroundHistory = async (
  params?: PlaygroundHistoryQuery
): Promise<PlaygroundHistoryListResponse> => {
  const response = await apiClient.get<PlaygroundHistoryListResponse>('/playground/history', {
    params,
  });
  return response.data;
};

export const getPlaygroundHistory = async (id: number): Promise<PlaygroundHistoryDetail> => {
  const response = await apiClient.get<PlaygroundHistoryDetail>(`/playground/history/${id}`);
  return response.data;
};

export const deletePlaygroundHistory = async (id: number): Promise<void> => {
  await apiClient.delete(`/playground/history/${id}`);
};

export const savePlaygroundResult = async (
  payload: PlaygroundSaveRequest
): Promise<PlaygroundSaveResponse> => {
  const response = await apiClient.post<PlaygroundSaveResponse>('/playground/save', payload);
  return response.data;
};

export const getPlaygroundSettings = async (): Promise<PlaygroundSettings> => {
  const response = await apiClient.get<PlaygroundSettings>('/playground/settings');
  return response.data;
};

export const updatePlaygroundSettings = async (
  patch: PlaygroundSettingsPatch
): Promise<PlaygroundSettingsUpdateResponse> => {
  const response = await apiClient.patch<PlaygroundSettingsUpdateResponse>(
    '/playground/settings',
    patch
  );
  return response.data;
};
