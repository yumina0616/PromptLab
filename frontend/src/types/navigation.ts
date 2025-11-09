export const PROMPT_CATEGORIES = ['Dev', 'Marketing', 'Design', 'Edu', 'Data'] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];

export type AppPage =
  | 'home'
  | 'repository'
  | 'editor'
  | 'playground'
  | 'profile'
  | 'auth'
  | 'settings'
  | 'category'
  | 'search'
  | 'team';

export type NavigateHandler = (page: AppPage, data?: unknown) => void;
