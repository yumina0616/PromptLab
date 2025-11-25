import { apiClient } from './client';
import type {
  CreateWorkspacePayload,
  CreateWorkspaceResponse,
  UpdateWorkspacePayload,
  WorkspaceListQuery,
  WorkspaceListResponse,
  WorkspaceDetail,
  WorkspaceMemberListResponse,
  WorkspaceInvitePayload,
  WorkspaceInviteListResponse,
  WorkspaceInviteAcceptResponse,
  WorkspaceInviteRejectResponse,
  WorkspaceMembershipChangeResponse,
  WorkspaceSharePromptPayload,
  WorkspaceSharePromptResponse,
  WorkspaceSharedPromptListResponse,
  UpdateWorkspaceResponse,
  WorkspaceInviteSendResponse,
} from '@/types/workspace';

export const createWorkspace = async (
  payload: CreateWorkspacePayload
): Promise<CreateWorkspaceResponse> => {
  const response = await apiClient.post<CreateWorkspaceResponse>('/workspaces', payload);
  return response.data;
};

export const getMyWorkspaces = async (
  params?: WorkspaceListQuery
): Promise<WorkspaceListResponse> => {
  const response = await apiClient.get<WorkspaceListResponse>('/workspaces', { params });
  return response.data;
};

export const getWorkspaceDetail = async (id: number): Promise<WorkspaceDetail> => {
  const response = await apiClient.get<WorkspaceDetail>(`/workspaces/${id}`);
  return response.data;
};

export const updateWorkspace = async (
  id: number,
  payload: UpdateWorkspacePayload
): Promise<UpdateWorkspaceResponse> => {
  const response = await apiClient.patch<UpdateWorkspaceResponse>(`/workspaces/${id}`, payload);
  return response.data;
};

export const deleteWorkspace = async (id: number): Promise<void> => {
  await apiClient.delete(`/workspaces/${id}`);
};

export const getWorkspaceMembers = async (id: number): Promise<WorkspaceMemberListResponse> => {
  const response = await apiClient.get<WorkspaceMemberListResponse>(`/workspaces/${id}/members`);
  return response.data;
};

export const addWorkspaceMember = async (
  id: number,
  payload: WorkspaceInvitePayload
): Promise<WorkspaceMembershipChangeResponse> => {
  const response = await apiClient.post<WorkspaceMembershipChangeResponse>(
    `/workspaces/${id}/members`,
    payload
  );
  return response.data;
};

export const updateWorkspaceMemberRole = async (
  workspaceId: number,
  userId: number,
  role: WorkspaceInvitePayload['role']
): Promise<WorkspaceMembershipChangeResponse> => {
  const response = await apiClient.patch<WorkspaceMembershipChangeResponse>(
    `/workspaces/${workspaceId}/members/${userId}`,
    { role }
  );
  return response.data;
};

export const removeWorkspaceMember = async (workspaceId: number, userId: number): Promise<void> => {
  await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}`);
};

export const sendWorkspaceInvite = async (
  workspaceId: number,
  payload: WorkspaceInvitePayload
): Promise<WorkspaceInviteSendResponse> => {
  const response = await apiClient.post<WorkspaceInviteSendResponse>(
    `/workspaces/${workspaceId}/invites`,
    payload
  );
  return response.data;
};

export const getWorkspaceInvites = async (
  workspaceId: number
): Promise<WorkspaceInviteListResponse> => {
  const response = await apiClient.get<WorkspaceInviteListResponse>(`/workspaces/${workspaceId}/invites`);
  return response.data;
};

export const acceptWorkspaceInvite = async (
  token: string
): Promise<WorkspaceInviteAcceptResponse> => {
  const response = await apiClient.patch<WorkspaceInviteAcceptResponse>(
    `/workspaces/invites/${token}/accept`
  );
  return response.data;
};

export const rejectWorkspaceInvite = async (
  token: string
): Promise<WorkspaceInviteRejectResponse> => {
  const response = await apiClient.patch<WorkspaceInviteRejectResponse>(
    `/workspaces/invites/${token}/reject`
  );
  return response.data;
};

export const cancelWorkspaceInvite = async (token: string): Promise<void> => {
  await apiClient.delete(`/workspaces/invites/${token}`);
};

export const getWorkspaceSharedPrompts = async (
  workspaceId: number,
  params?: WorkspaceListQuery
): Promise<WorkspaceSharedPromptListResponse> => {
  const response = await apiClient.get<WorkspaceSharedPromptListResponse>(
    `/workspaces/${workspaceId}/prompts`,
    { params }
  );
  return response.data;
};

export const sharePromptToWorkspace = async (
  workspaceId: number,
  promptId: number,
  payload: WorkspaceSharePromptPayload
): Promise<WorkspaceSharePromptResponse> => {
  const response = await apiClient.post<WorkspaceSharePromptResponse>(
    `/workspaces/${workspaceId}/prompts/${promptId}/share`,
    payload
  );
  return response.data;
};

export const updateWorkspaceSharedPromptRole = async (
  workspaceId: number,
  promptId: number,
  role: WorkspaceSharePromptPayload['role']
): Promise<WorkspaceSharePromptResponse> => {
  const response = await apiClient.patch<WorkspaceSharePromptResponse>(
    `/workspaces/${workspaceId}/prompts/${promptId}`,
    { role }
  );
  return response.data;
};

export const unsharePromptFromWorkspace = async (
  workspaceId: number,
  promptId: number
): Promise<void> => {
  await apiClient.delete(`/workspaces/${workspaceId}/prompts/${promptId}`);
};
