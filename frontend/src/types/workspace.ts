import type { PromptCreatePayload } from '@/types/prompt';

export type WorkspaceKind = 'personal' | 'team' | 'organization' | string;

export type WorkspaceRole = 'admin' | 'editor' | 'viewer' | string;

export interface WorkspaceSummary {
  id: number;
  kind: WorkspaceKind;
  name: string;
  slug: string;
  role: WorkspaceRole;
  description?: string | null;
}

export interface WorkspaceListResponse {
  items: WorkspaceSummary[];
  page: number;
  limit: number;
  total: number;
}

export interface WorkspaceDetail {
  id: number;
  kind: WorkspaceKind;
  name: string;
  slug: string;
  description?: string | null;
  created_by: {
    id: number;
    userid: string;
  } | null;
  created_at: string;
  members: {
    count: number;
  };
  prompts: {
    count: number;
  };
}

export interface WorkspaceMember {
  user: {
    id: number;
    userid: string;
    display_name: string;
  };
  role: WorkspaceRole;
  joined_at: string;
}

export interface WorkspaceMemberListResponse {
  items: WorkspaceMember[];
}

export interface WorkspaceInvite {
  invited_email: string;
  role: WorkspaceRole;
  token: string;
  status: 'pending' | 'accepted' | 'rejected' | string;
  user_id?: number;
}

export interface WorkspaceInviteListResponse {
  items: WorkspaceInvite[];
}

export interface WorkspaceSharedPrompt {
  prompt: {
    id: number;
    name: string;
    owner: {
      userid: string;
    };
  };
  role: WorkspaceRole;
  added_by: {
    userid: string;
  };
  added_at: string;
  latest_version: {
    id: number;
    version_number: number;
    created_at: string;
  } | null;
  stars: number;
  forks: number;
  tags: string[];
}

export interface WorkspaceSharedPromptListResponse {
  items: WorkspaceSharedPrompt[];
  page: number;
  limit: number;
  total: number;
}

export interface CreateWorkspacePayload {
  kind: WorkspaceKind;
  name: string;
  slug?: string;
  description?: string | null;
}

export interface CreateWorkspaceResponse {
  id: number;
  kind: WorkspaceKind;
  name: string;
  slug: string;
  description?: string | null;
  created_by: number;
  created_at: string;
}

export interface UpdateWorkspacePayload {
  name?: string;
  slug?: string;
}

export interface UpdateWorkspaceResponse {
  id: number;
  name: string;
  slug: string;
}

export interface WorkspaceListQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: 'recent' | 'name';
}

export interface WorkspaceInvitePayload {
  email: string;
  role: WorkspaceRole;
}

export interface WorkspaceInviteSendResponse {
  token: string;
  status: string;
  invited_email: string;
  role: WorkspaceRole;
}

export interface WorkspaceSharePromptPayload {
  role: WorkspaceRole;
}

export interface WorkspaceMembershipChangeResponse {
  workspace_id: number;
  user_id: number;
  role: WorkspaceRole;
}

export interface WorkspaceSharePromptResponse {
  workspace_id: number;
  prompt_id: number;
  role: WorkspaceRole;
}

export type WorkspacePromptCreatePayload = PromptCreatePayload & {
  role?: WorkspaceRole;
};

export interface WorkspacePromptCreateResponse {
  workspace_id: number;
  prompt_id: number;
  role: WorkspaceRole;
  prompt: {
    id: number;
    owner_id?: number;
    latest_version_id?: number | null;
  };
}

export interface WorkspaceInviteAcceptResponse {
  joined: boolean;
  workspace_id: number;
  role: WorkspaceRole;
}

export interface WorkspaceInviteRejectResponse {
  rejected: boolean;
}
