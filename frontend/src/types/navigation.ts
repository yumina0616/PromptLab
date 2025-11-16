export const PROMPT_CATEGORIES = ['Dev', 'Marketing', 'Design', 'Edu', 'Data'] as const;
export type PromptCategory = (typeof PROMPT_CATEGORIES)[number];
