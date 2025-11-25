import { apiClient } from './client';
import type { PromptTipResponse } from '@/types/rag';

export interface PromptTipRequest {
  prompt: string;
  limit?: number;
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export const requestPromptTips = async (payload: PromptTipRequest): Promise<PromptTipResponse> => {
  const response = await apiClient.post<{ data: PromptTipResponse }>('/rag/tips', payload);
  return response.data.data;
};
