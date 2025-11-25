import { apiClient } from './client';
import type { PromptFavoriteListResponse } from '@/types/prompt';

export interface FavoriteListQuery {
  page?: number;
  limit?: number;
}

export const listMyFavoritePrompts = async (
  userid: string,
  params?: FavoriteListQuery
): Promise<PromptFavoriteListResponse> => {
  const response = await apiClient.get<PromptFavoriteListResponse>(`/users/${userid}/favorites`, {
    params,
  });
  return response.data;
};
