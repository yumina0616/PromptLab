import { ArrowLeft, TrendingUp, Clock, Star, Loader2, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useNavigationType, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/store/useAppStore';
import { getPromptVersion, listPrompts } from '@/lib/api/k/prompts';
import type { PromptSummary, PromptVersion } from '@/types/prompt';
import { getCategoryVisual } from '@/lib/category-visuals';
import { DEFAULT_PROMPT_CATEGORIES } from '@/constants/categories';

interface CategoryPrompt {
  summary: PromptSummary;
  version: PromptVersion | null;
}

export function CategoryPage() {
const navigate = useNavigate();
const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategoryFromStore = useAppStore((state) => state.selectedCategoryCode);
  const setSelectedCategoryCode = useAppStore((state) => state.setSelectedCategoryCode);
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [trendingPrompts, setTrendingPrompts] = useState<CategoryPrompt[]>([]);
  const [recentPrompts, setRecentPrompts] = useState<CategoryPrompt[]>([]);
  const [popularPrompts, setPopularPrompts] = useState<CategoryPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const categoryCodeParam = searchParams.get('code');

  useEffect(() => {
    const nextCategory =
      categoryCodeParam || selectedCategoryFromStore || DEFAULT_PROMPT_CATEGORIES[0]?.code || null;
    setActiveCategory(nextCategory);
  }, [categoryCodeParam, selectedCategoryFromStore]);

  useEffect(() => {
    if (!activeCategory) return;
    setSelectedCategoryCode(activeCategory);
    setSearchParams({ code: activeCategory });

    let cancelled = false;

    const loadCategoryPrompts = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const fetchBySort = async (sort?: string) => {
        const response = await listPrompts(
          {
            limit: 40,
            category: activeCategory ?? undefined,
            sort,
          },
          { publicAccess: true }
        );

        const candidates = response.items.filter((item) => item.latest_version);
        return Promise.all(
          candidates.map(async (item) => {
            try {
              const version = item.latest_version
                ? await getPromptVersion(item.id, item.latest_version.id)
                : null;
              return { summary: item, version };
            } catch {
              return { summary: item, version: null };
            }
          })
        );
      };

      try {
        const [popular, recent] = await Promise.all([
          fetchBySort('stars'),
          fetchBySort('recent'),
        ]);

        if (!cancelled) {
          setPopularPrompts(popular);
          setTrendingPrompts(popular);
          setRecentPrompts(recent);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('프롬프트를 불러오지 못했습니다.', error);
          setErrorMessage('프롬프트 목록을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCategoryPrompts();

    return () => {
      cancelled = true;
    };
  }, [activeCategory, setSearchParams, setSelectedCategoryCode]);

  const activeCategoryInfo =
    DEFAULT_PROMPT_CATEGORIES.find((item) => item.code === activeCategory) || null;
  const categoryVisual = getCategoryVisual(activeCategory || undefined);

  const openPrompt = (promptId: number) => {
    setSelectedPromptId(promptId);
    const params = new URLSearchParams();
    params.set('id', promptId.toString());
    if (activeCategory) {
      params.set('from', 'category');
      params.set('category', activeCategory);
    }
    navigate(`/repository?${params.toString()}`);
  };

  const renderPromptCard = (item: CategoryPrompt) => (
    <Card
      key={item.summary.id}
      className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
      onClick={() => openPrompt(item.summary.id)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary">{item.version?.category_code || '카테고리 없음'}</Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {item.summary.star_count ?? 0}
            </span>
            <span>
              {item.version?.created_at
                ? new Date(item.version.created_at).toLocaleDateString()
                : ''}
            </span>
          </div>
        </div>
        <CardTitle>{item.summary.name}</CardTitle>
        <CardDescription>{item.summary.description || '설명이 없습니다.'}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {item.summary.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
          {item.summary.tags.length === 0 && (
            <span className="text-xs text-muted-foreground">태그 없음</span>
          )}
        </div>
        {item.version && (
          <Badge className="bg-primary text-xs">v{item.version.version_number}</Badge>
        )}
      </CardContent>
    </Card>
  );

  if (!activeCategory) {
    return (
      <div className="min-h-screen gradient-dark-bg gradient-overlay flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">카테고리를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <button
            onClick={() => {
              const historyState = window.history.state as { idx?: number } | null;
              if (
                historyState &&
                typeof historyState.idx === 'number' &&
                historyState.idx > 0 &&
                navigationType !== 'POP'
              ) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3 sm:mb-4"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Back to Explore</span>
          </button>

          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{
                backgroundColor: `${categoryVisual.accent}33`,
                boxShadow: `0 0 0 2px ${categoryVisual.accent}80`,
              }}
            >
              <categoryVisual.icon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl">
                {activeCategoryInfo?.name_kr || activeCategoryInfo?.name_en || activeCategory}
              </h2>
              <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
                {categoryVisual.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {errorMessage && (
          <Card className="border-destructive bg-destructive/10 mb-4">
            <CardContent className="py-4 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            프롬프트를 불러오는 중입니다...
          </div>
        ) : (
          <Tabs defaultValue="trending" className="space-y-4 sm:space-y-6">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="trending" className="text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Trending</span>
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs sm:text-sm">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Recent</span>
              </TabsTrigger>
              <TabsTrigger value="popular" className="text-xs sm:text-sm">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Popular</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trending">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {trendingPrompts.map(renderPromptCard)}
                {trendingPrompts.length === 0 && (
                  <p className="text-sm text-muted-foreground">해당 카테고리의 프롬프트가 없습니다.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="recent">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {recentPrompts.map(renderPromptCard)}
                {recentPrompts.length === 0 && (
                  <p className="text-sm text-muted-foreground">최근 프롬프트가 없습니다.</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="popular">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularPrompts.map(renderPromptCard)}
                {popularPrompts.length === 0 && (
                  <p className="text-sm text-muted-foreground">프롬프트가 없습니다.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
