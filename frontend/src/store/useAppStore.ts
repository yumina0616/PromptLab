import { create } from 'zustand';
import type { User } from '@/types/auth';
import type {
  UserProfile,
  UserPromptsResponse,
  UserFavoritesResponse,
  UserActivityResponse,
} from '@/types/user';
import * as authApi from '@/lib/api/k/auth';
import * as userApi from '@/lib/api/k/user';

type ProfileLike = Partial<UserProfile> & Record<string, any>;

const normalizeProfile = (profile: ProfileLike): UserProfile => {
  const statsSource = profile.stats || {};
  const visibilitySource =
    profile.visibility || {
      is_profile_public:
        typeof profile.is_profile_public === 'boolean' ? profile.is_profile_public : true,
      show_email: typeof profile.show_email === 'boolean' ? profile.show_email : false,
    };

  return {
    id: profile.id ?? 0,
    userid: profile.userid ?? '',
    display_name: profile.display_name ?? '',
    profile_image_url:
      profile.profile_image_url !== undefined ? profile.profile_image_url : null,
    bio: profile.bio ?? '',
    stats: {
      prompts:
        statsSource.prompts ??
        statsSource.prompt_count ??
        profile.prompt_count ??
        profile.prompts ??
        0,
      stars:
        statsSource.stars ??
        statsSource.star_count ??
        profile.star_count ??
        profile.stars ??
        0,
      forks: statsSource.forks ?? statsSource.fork_count ?? profile.fork_count ?? profile.forks ?? 0,
    },
    visibility: {
      is_profile_public: visibilitySource.is_profile_public ?? true,
      show_email: visibilitySource.show_email ?? false,
    },
    email: profile.email,
    theme: profile.theme,
    language: profile.language,
    timezone: profile.timezone,
    default_prompt_visibility: profile.default_prompt_visibility,
  };
};

const profileToUser = (profile: UserProfile, fallback?: User | null): User => ({
  id: profile.id,
  email: profile.email ?? fallback?.email ?? '',
  userid: profile.userid,
  display_name: profile.display_name,
  profile_image_url:
    profile.profile_image_url !== undefined
      ? profile.profile_image_url
      : fallback?.profile_image_url,
  theme: profile.theme ?? fallback?.theme,
  language: profile.language ?? fallback?.language,
  timezone: profile.timezone ?? fallback?.timezone,
  default_prompt_visibility:
    (profile.default_prompt_visibility as User['default_prompt_visibility']) ??
    fallback?.default_prompt_visibility,
});

const isUserEqual = (a: User | null | undefined, b: User): boolean => {
  if (!a) return false;
  return (
    a.id === b.id &&
    a.email === b.email &&
    a.userid === b.userid &&
    a.display_name === b.display_name &&
    (a.profile_image_url ?? null) === (b.profile_image_url ?? null) &&
    (a.theme ?? null) === (b.theme ?? null) &&
    (a.language ?? null) === (b.language ?? null) &&
    (a.timezone ?? null) === (b.timezone ?? null) &&
    (a.default_prompt_visibility ?? null) === (b.default_prompt_visibility ?? null)
  );
};

interface AppState {
  // 인증 관련
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;

  // 프로필 관련 (다른 사용자 프로필 조회용)
  viewedProfile: UserProfile | null;
  userPrompts: UserPromptsResponse | null;
  userFavorites: UserFavoritesResponse | null;
  userActivity: UserActivityResponse | null;

  // 기존 상태
  selectedPromptId: number | null;
  selectedCategoryCode: string | null;
  searchQuery: string;
  draftPromptContent: string;
  favoriteVersions: Record<number, boolean>;

  // 인증 액션
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, userid: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  setUser: (user: User | null) => void;

  // 프로필 액션
  fetchUserProfile: (userid: string) => Promise<void>;
  updateUserProfile: (userid: string, data: { display_name?: string; bio?: string; email?: string; profile_image_url?: string }) => Promise<void>;
  fetchUserPrompts: (userid: string, page?: number) => Promise<void>;
  fetchUserFavorites: (userid: string, page?: number) => Promise<void>;
  fetchUserActivity: (userid: string, page?: number) => Promise<void>;

  // 기존 액션
  setSelectedPromptId: (promptId: number | null) => void;
  setSelectedCategoryCode: (categoryCode: string | null) => void;
  setSearchQuery: (query: string) => void;
  setDraftPromptContent: (content: string) => void;
  setFavoriteStatus: (versionId: number, starred: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // 초기 상태
  isAuthenticated: false,
  user: null,
  accessToken: null,

  // 프로필 초기 상태
  viewedProfile: null,
  userPrompts: null,
  userFavorites: null,
  userActivity: null,

  selectedPromptId: null,
  selectedCategoryCode: null,
  searchQuery: '',
  draftPromptContent: '',
  favoriteVersions: {},

  // 로그인
  login: async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      // 토큰 저장
      localStorage.setItem('access_token', response.access_token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      set({
        isAuthenticated: true,
        user: response.user,
        accessToken: response.access_token,
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // 회원가입
  register: async (email: string, password: string, userid: string, displayName: string) => {
    try {
      const response = await authApi.register({
        email,
        password,
        userid,
        display_name: displayName,
      });

      // 토큰 저장
      localStorage.setItem('access_token', response.access_token);
      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
      }

      set({
        isAuthenticated: true,
        user: response.user,
        accessToken: response.access_token,
      });
    } catch (error) {
      console.error('Register failed:', error);
      throw error;
    }
  },

  // 로그아웃
  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      // 로컬 스토리지 정리
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');

      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        selectedPromptId: null,
        selectedCategoryCode: null,
      });
    }
  },

  // 자동 로그인 (앱 시작 시 토큰 확인)
  initializeAuth: async () => {
    const token = localStorage.getItem('access_token');
    const userStr = localStorage.getItem('user');

    const attemptGetMe = async () => {
      const profile = normalizeProfile(await authApi.getMe());
      const summary = profileToUser(profile, get().user);
      const shouldUpdateUser = !isUserEqual(get().user, summary);
      set((state) => ({
        isAuthenticated: true,
        user: shouldUpdateUser ? summary : state.user,
        accessToken: localStorage.getItem('access_token'),
        viewedProfile: profile,
      }));
      if (shouldUpdateUser) {
        localStorage.setItem('user', JSON.stringify(summary));
      }
    };

    const clearSession = () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      set({
        isAuthenticated: false,
        user: null,
        accessToken: null,
      });
    };

    const attemptRefresh = async () => {
      const refresh = await authApi.refreshToken();
      localStorage.setItem('access_token', refresh.access_token);
      await attemptGetMe();
    };

    if (token) {
      try {
        await attemptGetMe();
        return;
      } catch (error) {
        console.warn('Access token invalid, attempting refresh...');
        try {
          await attemptRefresh();
          return;
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
        }
      }
    } else {
      try {
        await attemptRefresh();
        return;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
      }
    }

    clearSession();
  },

  // 사용자 정보 설정
  setUser: (user: User | null) => set({ user }),

  // 프로필 조회
  fetchUserProfile: async (userid: string) => {
    try {
      const currentUser = get().user;
      let profileData: UserProfile | ProfileLike;
      if (currentUser && currentUser.userid === userid) {
        profileData = await authApi.getMe();
      } else {
        profileData = await userApi.getProfile(userid);
      }
      const normalized = normalizeProfile(profileData);
      set({ viewedProfile: normalized });

      if (currentUser && currentUser.userid === userid) {
        const summary = profileToUser(normalized, currentUser);
        if (!isUserEqual(currentUser, summary)) {
          set({ user: summary });
          localStorage.setItem('user', JSON.stringify(summary));
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  },

  // 프로필 수정
  updateUserProfile: async (
    userid: string,
    data: { display_name?: string; bio?: string; email?: string; profile_image_url?: string }
  ) => {
    try {
      const updatedProfile = await userApi.updateProfile(userid, data);
      const normalized = normalizeProfile(updatedProfile);

      // viewedProfile 업데이트
      set({ viewedProfile: normalized });

      // 본인 프로필인 경우 user 정보도 업데이트
      const currentUser = get().user;
      if (currentUser && currentUser.userid === userid) {
        const summary = profileToUser(normalized, currentUser);
        if (!isUserEqual(currentUser, summary)) {
          set({ user: summary });
          localStorage.setItem('user', JSON.stringify(summary));
        }
      }
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error;
    }
  },

  // 사용자 프롬프트 목록 조회
  fetchUserPrompts: async (userid: string, page = 1) => {
    try {
      const prompts = await userApi.getUserPrompts(userid, { page, limit: 20, sort: 'recent' });
      set({ userPrompts: prompts });
    } catch (error) {
      console.error('Failed to fetch user prompts:', error);
      throw error;
    }
  },

  // 즐겨찾기 목록 조회
  fetchUserFavorites: async (userid: string, page = 1) => {
    try {
      const favorites = await userApi.getUserFavorites(userid, { page, limit: 20, sort: 'recent' });
      set({ userFavorites: favorites });
    } catch (error) {
      console.error('Failed to fetch user favorites:', error);
      throw error;
    }
  },

  // 포크 목록 조회
  // 활동 로그 조회
  fetchUserActivity: async (userid: string, page = 1) => {
    try {
      const activity = await userApi.getUserActivity(userid, { page, limit: 20, sort: 'recent' });
      set({ userActivity: activity });
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
      throw error;
    }
  },

  // 기존 액션
  setSelectedPromptId: (selectedPromptId) => set({ selectedPromptId }),
  setSelectedCategoryCode: (selectedCategoryCode) => set({ selectedCategoryCode }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setDraftPromptContent: (draftPromptContent) => set({ draftPromptContent }),
  setFavoriteStatus: (versionId, starred) =>
    set((state) => {
      const updated = { ...state.favoriteVersions };
      if (starred) {
        updated[versionId] = true;
      } else {
        delete updated[versionId];
      }
      localStorage.setItem('favorite_version_ids', JSON.stringify(Object.keys(updated)));
      return { favoriteVersions: updated };
    }),
}));
