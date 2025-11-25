export interface StaticPromptCategory {
  code: string;
  name_kr: string;
  name_en: string;
}

export const DEFAULT_PROMPT_CATEGORIES: StaticPromptCategory[] = [
  { code: 'dev', name_kr: '개발', name_en: 'Development' },
  { code: 'design', name_kr: '디자인', name_en: 'Design' },
  { code: 'marketing', name_kr: '마케팅', name_en: 'Marketing' },
  { code: 'general', name_kr: '일반', name_en: 'General' },
  { code: 'etc', name_kr: '기타', name_en: 'Etc' },
];
