import { apiClient } from './client';
import type {
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  NotificationListParams,
  NotificationListResponse,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllAsReadRequest,
  MarkAllAsReadResponse,
  ClearNotificationsParams,
} from '@/types/notifications';

// 알림 설정

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const response = await apiClient.get<NotificationSettings>('/notifications/settings');
  return response.data;
};

export const updateNotificationSettings = async (
  data: UpdateNotificationSettingsRequest
): Promise<NotificationSettings> => {
  const response = await apiClient.patch<NotificationSettings>('/notifications/settings', data);
  return response.data;
};

// 알림 목록

export const getNotifications = async (
  params?: NotificationListParams
): Promise<NotificationListResponse> => {
  const response = await apiClient.get<NotificationListResponse>('/notifications', {
    params,
  });
  return response.data;
};

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
  const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
  return response.data;
};

export const markAsRead = async (id: number): Promise<MarkAsReadResponse> => {
  const response = await apiClient.patch<MarkAsReadResponse>(`/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async (
  data?: MarkAllAsReadRequest
): Promise<MarkAllAsReadResponse> => {
  const response = await apiClient.patch<MarkAllAsReadResponse>('/notifications/read-all', data || {});
  return response.data;
};

export const deleteNotification = async (id: number): Promise<void> => {
  await apiClient.delete(`/notifications/${id}`);
};

export const clearNotifications = async (params?: ClearNotificationsParams): Promise<void> => {
  await apiClient.delete('/notifications', { params });
};
