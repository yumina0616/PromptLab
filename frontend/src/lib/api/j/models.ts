import { apiClient } from './client';
import type {
  ModelListQuery,
  ModelListResponse,
  ModelDetail,
  ModelTestRequest,
  ModelTestResponse,
} from '@/types/model';

export const fetchModels = async (params?: ModelListQuery): Promise<ModelListResponse> => {
  const response = await apiClient.get<ModelListResponse>('/models', { params });
  return response.data;
};

export const fetchModelDetail = async (id: number): Promise<ModelDetail> => {
  const response = await apiClient.get<ModelDetail>(`/models/${id}`);
  return response.data;
};

export const testModel = async (payload: ModelTestRequest): Promise<ModelTestResponse> => {
  const response = await apiClient.post<ModelTestResponse>('/models/test', payload);
  return response.data;
};
