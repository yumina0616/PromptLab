import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/useAppStore';
import {
  createPrompt,
  createPromptVersion,
  getPrompt,
  getPromptVersion,
  listPromptCategories,
} from '@/lib/api/k/prompts';
import { fetchModels } from '@/lib/api/k/models';
import { createWorkspacePrompt } from '@/lib/api/k/workspaces';
import type { ModelSummary } from '@/types/model';
import { DEFAULT_PROMPT_CATEGORIES } from '@/constants/categories';

const ALLOWED_MODEL_IDS = [1, 17];
const MODEL_LABEL_OVERRIDES: Record<number, string> = {
  1: 'ChatGPT',
  17: 'Gemini',
};
const FALLBACK_MODELS: ModelSummary[] = [
  { id: 1, provider: 'openai', model_code: 'gpt', display_name: 'ChatGPT', is_active: true },
  { id: 17, provider: 'google', model_code: 'gemini', display_name: 'Gemini', is_active: true },
];

export function PromptEditor() {
  const navigate = useNavigate();
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const draftPromptContent = useAppStore((state) => state.draftPromptContent);
  const setDraftPromptContent = useAppStore((state) => state.setDraftPromptContent);
  const [searchParams] = useSearchParams();
  const targetPromptId = searchParams.get('promptId')
    ? Number(searchParams.get('promptId'))
    : null;
  const mode = searchParams.get('mode') === 'new-version' ? 'new-version' : 'new-prompt';
  const isNewVersion = mode === 'new-version' && !!targetPromptId;
  const workspaceIdParam = searchParams.get('workspaceId');
  const parsedWorkspaceId = workspaceIdParam ? Number(workspaceIdParam) : null;
  const workspaceId =
    typeof parsedWorkspaceId === 'number' && !Number.isNaN(parsedWorkspaceId)
      ? parsedWorkspaceId
      : null;
  const isWorkspaceContext = workspaceId !== null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState(draftPromptContent || '');
  const [tags, setTags] = useState('');
  const [categoryCode, setCategoryCode] = useState<string>('');
  const [modelId, setModelId] = useState<number | null>(null);
  const [categories, setCategories] = useState(DEFAULT_PROMPT_CATEGORIES);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [commitMessage, setCommitMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [models, setModels] = useState<ModelSummary[]>([]);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  useEffect(() => {
    if (!isNewVersion && draftPromptContent) {
      setContent(draftPromptContent);
      setDraftPromptContent('');
    }
  }, [draftPromptContent, isNewVersion, setDraftPromptContent]);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const modelResponse = await fetchModels({ active: true, limit: 50 });
        const activeModels = modelResponse.items.filter((item) =>
          ALLOWED_MODEL_IDS.includes(item.id)
        );
        const usable = activeModels.length > 0 ? activeModels : FALLBACK_MODELS;
        setModels(usable);
        if (usable.length === 0) {
          setModelId(null);
        } else if (!modelId || !usable.some((model) => model.id === modelId)) {
          setModelId(usable[0].id);
        }
      } catch (error) {
        console.error('메타데이터 로딩 실패', error);
      }
    };
    loadMeta();
  }, [modelId]);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const response = await listPromptCategories();
        if (cancelled) return;
        if (response.items?.length) {
          const normalized = response.items.map((item) => ({
            code: item.code,
            name_kr: item.name_kr || '',
            name_en: item.name_en || item.code,
          }));
          setCategories(normalized);
          return;
        }
        setCategories(DEFAULT_PROMPT_CATEGORIES);
      } catch (error) {
        if (!cancelled) {
          console.error('카테고리 로딩 실패', error);
          setCategories(DEFAULT_PROMPT_CATEGORIES);
        }
      }
    };
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!categoryCode) return;
    if (!categories.some((category) => category.code === categoryCode)) {
      setCategoryCode('');
    }
  }, [categories, categoryCode]);

  useEffect(() => {
    if (!isNewVersion || !targetPromptId) return;
    let cancelled = false;
    const loadPrompt = async () => {
      setIsLoadingPrompt(true);
      try {
        const prompt = await getPrompt(targetPromptId);
        if (cancelled) return;
        setTitle(prompt.name);
        setDescription(prompt.description || '');
        setTags(prompt.tags.join(', '));
        if (prompt.latest_version?.id) {
          const version = await getPromptVersion(targetPromptId, prompt.latest_version.id);
          if (cancelled) return;
          setContent(version.content || '');
          setCategoryCode(version.category_code || '');
          setCommitMessage('');
          if (version.model_setting?.ai_model_id) {
            setModelId(version.model_setting.ai_model_id);
          }
          if (typeof version.model_setting?.temperature === 'number') {
            setTemperature(version.model_setting.temperature);
          }
          if (typeof version.model_setting?.max_token === 'number') {
            setMaxTokens(version.model_setting.max_token);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('프롬프트 로딩 실패', error);
          setErrorMessage('프롬프트 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPrompt(false);
        }
      }
    };
    loadPrompt();
    return () => {
      cancelled = true;
    };
  }, [isNewVersion, targetPromptId]);

  const tagList = useMemo(
    () => tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    [tags]
  );

  const handleBack = () => {
    setSelectedPromptId(null);
    navigate(isWorkspaceContext ? '/team' : '/');
  };

  const handleSave = async () => {
    if (!content.trim()) {
      setErrorMessage('프롬프트 내용을 입력해주세요.');
      return;
    }
    if (!modelId) {
      setErrorMessage('모델을 선택해주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const normalizedCategoryCode =
      categoryCode && categories.some((category) => category.code === categoryCode)
        ? categoryCode
        : undefined;

    try {
      if (isNewVersion && targetPromptId) {
        const response = await createPromptVersion(targetPromptId, {
          content,
          commit_message: commitMessage || 'New version',
          category_code: normalizedCategoryCode,
          is_draft: false,
          model_setting: {
            ai_model_id: modelId,
            temperature,
            max_token: maxTokens,
          },
        });
        setSuccessMessage('새 버전을 생성했습니다.');
        setSelectedPromptId(targetPromptId);
        navigate(`/repository?id=${targetPromptId}&version=${response.id}`);
      } else if (workspaceId !== null) {
        const response = await createWorkspacePrompt(workspaceId, {
          name: title || '새 팀 프롬프트',
          description: description || undefined,
          visibility: 'private',
          tags: tagList,
          content,
          commit_message: commitMessage || 'Initial version',
          category_code: normalizedCategoryCode,
          is_draft: false,
          model_setting: {
            ai_model_id: modelId,
            temperature,
            max_token: maxTokens,
          },
          role: 'editor',
        });
        const newPromptId = response.prompt_id || response.prompt?.id;
        setSuccessMessage('팀 프롬프트를 생성했습니다.');
        if (newPromptId) {
          setSelectedPromptId(newPromptId);
          navigate(`/repository?id=${newPromptId}`);
        } else {
          navigate('/team');
        }
      } else {
        const response = await createPrompt({
          name: title || '새 프롬프트',
          description: description || undefined,
          visibility: 'public',
          tags: tagList,
          content,
          commit_message: commitMessage || 'Initial version',
          category_code: normalizedCategoryCode,
          is_draft: false,
          model_setting: {
            ai_model_id: modelId,
            temperature,
            max_token: maxTokens,
          },
        });
        setSuccessMessage('프롬프트를 생성했습니다.');
        setSelectedPromptId(response.id);
        navigate(`/repository?id=${response.id}`);
      }
    } catch (error) {
      console.error('저장 실패', error);
      setErrorMessage('저장 중 문제가 발생했습니다. 입력 내용을 확인하고 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <h1 className="text-base sm:text-lg lg:text-xl">
              {isNewVersion ? '새 버전 만들기' : '새 프롬프트 작성'}
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button onClick={handleSave} size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  저장
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
        {errorMessage && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-3 text-sm text-destructive">{errorMessage}</CardContent>
          </Card>
        )}
        {successMessage && (
          <Card className="border-emerald-500 bg-emerald-500/10">
            <CardContent className="py-3 text-sm text-emerald-500">{successMessage}</CardContent>
          </Card>
        )}
        {isLoadingPrompt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            프롬프트를 불러오는 중입니다...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Prompt Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isNewVersion && (
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="예: 코드 리뷰 어시스턴트"
                      className="mt-2"
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="프롬프트에 대한 간단한 설명"
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={categoryCode} onValueChange={setCategoryCode}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="카테고리 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.code} value={category.code}>
                            {category.name_kr || category.name_en || category.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                      className="mt-2"
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tagList.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Prompt Content</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="프롬프트 내용을 작성해주세요..."
                  className="font-mono text-sm min-h-[400px]"
                />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Commit Message</CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="예: 초기 버전 생성"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Model Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Model</Label>
                  <Select
                    value={modelId ? String(modelId) : undefined}
                    onValueChange={(value) => setModelId(Number(value))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="모델 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={String(model.id)}>
                          {MODEL_LABEL_OVERRIDES[model.id] ?? model.display_name ?? `Model ${model.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">{temperature}</span>
                  </div>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={[temperature]}
                    onValueChange={(value) => setTemperature(value[0])}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Max Tokens</Label>
                    <span className="text-sm text-muted-foreground">{maxTokens}</span>
                  </div>
                  <Slider
                    min={100}
                    max={4000}
                    step={100}
                    value={[maxTokens]}
                    onValueChange={(value) => setMaxTokens(value[0])}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>· 버전을 나누어 관리하면 변경 사항을 추적하기 쉽습니다.</p>
                <p>· 커밋 메시지는 다른 협업자가 이해하기 쉽게 작성해주세요.</p>
                <p>· 모델 설정은 Playground에서 실험한 값을 그대로 활용할 수 있습니다.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
