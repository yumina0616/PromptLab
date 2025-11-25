// 알림 설정

export interface NotificationSettings {
  email_comment: boolean;
  email_star_fork: boolean;
  email_follower: boolean;
  email_weekly_digest: boolean;
  push_enable: boolean;
  updated_at: string;
}

export interface UpdateNotificationSettingsRequest {
  email_comment?: boolean;
  email_star_fork?: boolean;
  email_follower?: boolean;
  email_weekly_digest?: boolean;
  push_enable?: boolean;
}

// 알림 타입

export type NotificationType =
  | 'comment_created'
  | 'prompt_favorited'
  | 'prompt_forked'
  | 'workspace_invite_received'
  | 'workspace_invite_accepted'
  | 'workspace_member_added'
  | 'workspace_prompt_shared'
  | 'weekly_digest';

export type NotificationEntityType =
  | 'prompt_version'
  | 'workspace_invite'
  | 'workspace'
  | 'workspace_prompt'
  | 'digest';

// 알림 엔티티

export interface NotificationEntity {
  entity_type: NotificationEntityType;
  entity_id: number;
}

// 알림 아이템

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  entity: NotificationEntity;
  actor_user_id?: number | null;
  workspace_id?: number | null;
  is_read: boolean;
  created_at: string;
}

// 알림 목록

export interface NotificationListParams {
  page?: number;
  limit?: number;
  type?: NotificationType | NotificationType[];
  unread?: boolean;
  from?: string;
  to?: string;
}

export interface NotificationListResponse {
  items: Notification[];
  page: number;
  limit: number;
  total: number;
}

// 안 읽은 개수

export interface UnreadCountResponse {
  unread: number;
}

// 읽음 처리

export interface MarkAsReadResponse {
  is_read: boolean;
  unread_count: number;
}

export interface MarkAllAsReadRequest {
  type?: NotificationType[];
}

export interface MarkAllAsReadResponse {
  updated: number;
  unread_count: number;
}

// 삭제

export interface ClearNotificationsParams {
  type?: NotificationType | NotificationType[];
  is_read?: boolean;
  before?: string;
}
