import { Code2, Megaphone, Palette, GraduationCap, BarChart3, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryVisual {
  icon: LucideIcon;
  color: string;
  accent: string;
  description: string;
}

const CATEGORY_VISUALS: Record<string, CategoryVisual> = {
  dev: { icon: Code2, color: 'bg-blue-500', accent: '#3b82f6', description: '개발 · 엔지니어링' },
  marketing: { icon: Megaphone, color: 'bg-pink-500', accent: '#ec4899', description: '마케팅 · 성장' },
  design: { icon: Palette, color: 'bg-purple-500', accent: '#a855f7', description: '디자인 · 크리에이티브' },
  edu: { icon: GraduationCap, color: 'bg-emerald-500', accent: '#10b981', description: '교육 · 학습' },
  data: { icon: BarChart3, color: 'bg-orange-500', accent: '#f97316', description: '데이터 · 분석' },
};

const DEFAULT_VISUAL: CategoryVisual = {
  icon: Layers,
  color: 'bg-slate-500',
  accent: '#7c7f88',
  description: '프롬프트 탐색',
};

export function getCategoryVisual(code?: string | null): CategoryVisual {
  if (!code) return DEFAULT_VISUAL;
  return CATEGORY_VISUALS[code.toLowerCase()] ?? DEFAULT_VISUAL;
}
