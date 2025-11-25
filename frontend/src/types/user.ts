// 사용자 프로필 조회 응답
export interface UserProfile {
  id: number;
  userid: string;
  display_name: string;
  profile_image_url: string | null;
  bio: string;
  stats: {
    prompts: number;
    stars: number;
    forks: number;
  };
  visibility: {
    is_profile_public: boolean;
    show_email: boolean;
  };
  email?: string;
  theme?: string;
  language?: string;
  timezone?: string;
  default_prompt_visibility?: string;
}

// 프로필 수정 요청
export interface UpdateProfileRequest {
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  email?: string;
}

// 프롬프트 아이템 (프롬프트 목록, 즐겨찾기, 포크에서 공통으로 사용)
export interface PromptItem {
  id: number;
  name: string;
  description: string;
  author: {
    userid: string;
    display_name: string;
  };
  stats: {
    stars: number;
    forks: number;
    runs: number;
  };
  visibility: 'public' | 'unlisted' | 'private';
  created_at: string;
  updated_at: string;
}

// 사용자 프롬프트 목록 응답
export interface UserPromptsResponse {
  items: PromptItem[];  
  total: number;
  page: number;
  limit: number;
}

// 즐겨찾기한 프롬프트 버전 아이템 
export interface FavoriteItem {
  prompt_version_id: number;
  prompt: {
    id: number;
    name: string;
  };
  version_number: string;
  starred_at: string;
  owner: {
    userid: string;
    display_name: string;
  };
}

// 즐겨찾기 목록 응답
export interface UserFavoritesResponse {
  items: FavoriteItem[];  
  total: number;
  page: number;
  limit: number;
}

// 포크한 프롬프트 아이템
export interface ForkItem {
  target_prompt_id: number;
  name: string;
  source_version_id: number;
  forked_at: string;
  source_owner: {
    userid: string;
  };
}

// 포크 목록 응답
export interface UserForksResponse {
  items: ForkItem[];  
  total: number;
  page: number;
  limit: number;
}

// 활동 로그 아이템 
export interface ActivityLogItem {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  metadata: any;
  created_at: string;
}

// 활동 로그 응답
export interface UserActivityResponse {
  items: ActivityLogItem[];  
  total: number;
  page: number;
  limit: number;
}

// 데이터 내보내기 응답
export interface ExportJobResponse {
  job_id: string;
  status: 'queued' | 'pending' | 'processing' | 'completed' | 'failed';
}

// 계정 삭제 이메일 요청 응답
export interface RequestAccountDeletionResponse {
  message: string;
  email: string;
}

// 계정 삭제 요청
export interface DeleteAccountRequest {
  verification_token: string;
}

// 계정 삭제 응답
export interface DeleteAccountResponse {
  message: string;
}
