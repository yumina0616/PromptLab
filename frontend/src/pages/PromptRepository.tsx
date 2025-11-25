import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Loader2, Sparkles, Heart, MessageSquare, Send, Trash2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import {
  getPrompt,
  getPromptVersion,
  listPromptVersions,
  addPromptFavorite,
  removePromptFavorite,
  listPromptComments,
  createPromptComment,
  deletePromptComment,
} from '@/lib/api/k/prompts';
import { runPlayground } from '@/lib/api/k/playground';
import { getUserFavorites } from '@/lib/api/k/user';
import { getMyWorkspaces, sharePromptToWorkspace } from '@/lib/api/k/workspaces';
import type { WorkspaceRole, WorkspaceSummary } from '@/types/workspace';
import type { PromptDetail, PromptVersion, PromptComment } from '@/types/prompt';

const MODEL_NAME_MAP: Record<number, string> = {
  1: 'ChatGPT',
  17: 'Gemini',
};

const getModelDisplayName = (id?: number | null) => {
  if (!id) return '알 수 없음';
  return MODEL_NAME_MAP[id] ?? `ID ${id}`;
};

export function PromptRepository() {
  const navigate = useNavigate();
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const currentUser = useAppStore((state) => state.user);
  const favoriteVersions = useAppStore((state) => state.favoriteVersions);
  const setFavoriteStatus = useAppStore((state) => state.setFavoriteStatus);
  const logout = useAppStore((state) => state.logout);
  const storedPromptId = useAppStore((state) => state.selectedPromptId);
  const [searchParams] = useSearchParams();
  const promptIdParam = searchParams.get('id');
  const versionParam = searchParams.get('version');
  const promptId = promptIdParam ? Number(promptIdParam) : storedPromptId;
  const initialVersionId = versionParam ? Number(versionParam) : null;

  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<number | null>(initialVersionId);
  const [activeVersion, setActiveVersion] = useState<PromptVersion | null>(null);
  const [isPromptLoading, setIsPromptLoading] = useState(false);
  const [isVersionLoading, setIsVersionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState('');
  const [runError, setRunError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [favoriteVersionIds, setFavoriteVersionIds] = useState<Set<number>>(new Set());
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [isFavoriteMutating, setIsFavoriteMutating] = useState(false);
  const [comments, setComments] = useState<PromptComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareWorkspaces, setShareWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [isShareLoading, setIsShareLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);
  const [shareRole, setShareRole] = useState<WorkspaceRole>('editor');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    try {
      const initialIds = Object.keys(favoriteVersions)
        .map((key) => Number(key))
        .filter((id) => Number.isFinite(id) && favoriteVersions[id]);
      setFavoriteVersionIds(new Set(initialIds));
    } catch (err) {
      console.warn('즐겨찾기 초기화 실패', err);
    }
  }, [favoriteVersions]);

  useEffect(() => {
    if (!promptId || Number.isNaN(promptId)) {
      setPrompt(null);
      setVersions([]);
      setActiveVersionId(null);
      return;
    }
    let cancelled = false;
    const loadPrompt = async () => {
      setIsPromptLoading(true);
      setErrorMessage(null);
      try {
        const [promptDetail, versionResponse] = await Promise.all([
          getPrompt(promptId),
          listPromptVersions(promptId, { includeDraft: true }),
        ]);
        if (cancelled) return;
        setPrompt(promptDetail);
        setVersions(versionResponse.items);
        const nextVersionId =
          initialVersionId ||
          promptDetail.latest_version?.id ||
          versionResponse.items[0]?.id ||
          null;
        setActiveVersionId(nextVersionId);
      } catch (error) {
        if (!cancelled) {
          console.error('프롬프트를 불러오지 못했습니다.', error);
          setErrorMessage('프롬프트 정보를 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsPromptLoading(false);
        }
      }
    };
    loadPrompt();
    return () => {
      cancelled = true;
    };
  }, [promptId, initialVersionId]);

  useEffect(() => {
    if (!promptId || !activeVersionId) {
      setActiveVersion(null);
      return;
    }
    let cancelled = false;
    const loadVersion = async () => {
      setIsVersionLoading(true);
      try {
        const version = await getPromptVersion(promptId, activeVersionId);
        if (!cancelled) {
          setActiveVersion(version);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('버전을 불러오지 못했습니다.', error);
          setErrorMessage('선택한 버전을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsVersionLoading(false);
        }
      }
    };
    loadVersion();
    return () => {
      cancelled = true;
    };
  }, [promptId, activeVersionId]);

  useEffect(() => {
    if (!promptId || !activeVersionId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    const loadComments = async () => {
      setCommentsLoading(true);
      setCommentError(null);
      try {
        const response = await listPromptComments(promptId, activeVersionId);
        if (!cancelled) {
          setComments(response.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('댓글을 불러오지 못했습니다.', error);
          setCommentError('댓글을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) {
          setCommentsLoading(false);
        }
      }
    };
    loadComments();
    return () => {
      cancelled = true;
    };
  }, [promptId, activeVersionId]);

  useEffect(() => {
    if (!currentUser) {
      setFavoriteVersionIds(new Set());
      localStorage.removeItem('favorite_version_ids');
      return;
    }
    let cancelled = false;
    setFavoritesLoading(true);
    setFavoriteError(null);
    getUserFavorites(currentUser.userid, { limit: 200 })
      .then((response) => {
        if (cancelled) return;
        const ids = new Set(
          response.items
            .map((item) => Number(item.prompt_version_id))
            .filter((id) => Number.isFinite(id))
        );
        setFavoriteVersionIds(ids);
        localStorage.setItem('favorite_version_ids', JSON.stringify([...ids]));
        // 글로벌 캐시 업데이트
        ids.forEach((id) => setFavoriteStatus(id, true));
      })
      .catch((error) => {
        if (!cancelled) {
          const status =
            typeof error === 'object' && error !== null && 'response' in error
              ? (error as { response?: { status?: number } }).response?.status
              : undefined;
          if (status === 401) {
            setFavoriteError('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            logout().catch(() => {
              /* 이미 만료된 세션 */
            });
          } else {
            console.error('즐겨찾기 목록을 불러오지 못했습니다.', error);
            setFavoriteError('즐겨찾기 정보를 불러오지 못했습니다.');
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFavoritesLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser, logout, setFavoriteStatus]);

  useEffect(() => {
    if (!isShareDialogOpen || !currentUser) return;
    setIsShareLoading(true);
    getMyWorkspaces({ limit: 50 })
      .then((response) => {
        setShareWorkspaces(response.items);
        if (response.items.length > 0 && !selectedWorkspaceId) {
          setSelectedWorkspaceId(response.items[0].id);
        }
      })
      .catch((error) => {
        console.error('워크스페이스 목록을 불러오지 못했습니다.', error);
      })
      .finally(() => setIsShareLoading(false));
  }, [isShareDialogOpen, currentUser, selectedWorkspaceId]);

  const sortedVersions = useMemo(
    () =>
      [...versions].sort(
        (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0)
      ),
    [versions]
  );

  const handleRun = async () => {
    if (!promptId || !activeVersion || !activeVersion.content) {
      return;
    }
    const modelId = activeVersion.model_setting?.ai_model_id;
    if (!modelId) {
      setRunError('모델 설정이 없습니다.');
      return;
    }
    setRunError(null);
    setIsRunning(true);
    setRunOutput('');
    try {
      const response = await runPlayground({
        prompt_text: activeVersion.content,
        model_id: modelId,
        model_params: {
          temperature: activeVersion.model_setting?.temperature ?? undefined,
          max_token: activeVersion.model_setting?.max_token ?? undefined,
          top_p: activeVersion.model_setting?.top_p ?? undefined,
        },
        source: {
          prompt_id: promptId,
          prompt_version_id: activeVersion.id,
        },
        analyzer: {
          enabled: true,
        },
      });
      setRunOutput(response.output);
    } catch (error) {
      console.error('실행에 실패했습니다.', error);
      setRunError('실행 중 오류가 발생했습니다. 잠시 후 다시 시도하세요.');
    } finally {
      setIsRunning(false);
    }
  };

  const goHome = () => {
    setSelectedPromptId(null);
    const fromParam = searchParams.get('from');
    const categoryCode = searchParams.get('category');
    if (fromParam === 'category' && categoryCode) {
      navigate(`/category?code=${encodeURIComponent(categoryCode)}`);
      return;
    }
    navigate('/');
  };

  const activeVersionNumericId =
    activeVersion && Number.isFinite(Number(activeVersion.id))
      ? Number(activeVersion.id)
      : null;
  const isFavorite =
    activeVersionNumericId !== null &&
    (favoriteVersionIds.has(activeVersionNumericId) || favoriteVersions[activeVersionNumericId]);
  const isPromptOwner =
    currentUser && activeVersion?.created_by && Number(activeVersion.created_by) === currentUser.id;

  const handleSubmitComment = async () => {
    if (!promptId || !activeVersionId || !newComment.trim() || isCommentSubmitting) return;
    setIsCommentSubmitting(true);
    setCommentError(null);
    try {
      const created = await createPromptComment(promptId, activeVersionId, newComment.trim());
      setComments((prev) => [created, ...prev]);
      setNewComment('');
    } catch (error) {
      console.error('댓글 작성 실패', error);
      setCommentError('댓글을 작성하지 못했습니다.');
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!promptId || !activeVersionId) return;
    try {
      await deletePromptComment(promptId, activeVersionId, commentId);
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    } catch (error) {
      console.error('댓글 삭제 실패', error);
      setCommentError('댓글을 삭제하지 못했습니다.');
    }
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !promptId || !activeVersion?.id) return;
    setIsFavoriteMutating(true);
    setFavoriteError(null);
    try {
      if (activeVersionNumericId === null) return;

      if (favoriteVersionIds.has(activeVersionNumericId)) {
        await removePromptFavorite(promptId, activeVersionNumericId);
        setFavoriteVersionIds((prev) => {
          const next = new Set(prev);
          next.delete(activeVersionNumericId);
          localStorage.setItem('favorite_version_ids', JSON.stringify([...next]));
          return next;
        });
        setFavoriteStatus(activeVersionNumericId, false);
      } else {
        const response = await addPromptFavorite(promptId, activeVersionNumericId);
        if (response.starred) {
          setFavoriteVersionIds((prev) => {
            const next = new Set(prev);
            next.add(activeVersionNumericId);
            localStorage.setItem('favorite_version_ids', JSON.stringify([...next]));
            return next;
          });
          setFavoriteStatus(activeVersionNumericId, true);
        }
      }
    } catch (error) {
      console.error('즐겨찾기를 업데이트하지 못했습니다.', error);
      setFavoriteError('즐겨찾기를 업데이트하지 못했습니다.');
    } finally {
      setIsFavoriteMutating(false);
    }
  };

  const handleSharePrompt = async () => {
    if (!promptId || !selectedWorkspaceId) return;
    setIsSharing(true);
    try {
      await sharePromptToWorkspace(selectedWorkspaceId, promptId, { role: shareRole });
      alert('팀에 프롬프트를 공유했습니다.');
      setIsShareDialogOpen(false);
    } catch (error) {
      console.error('프롬프트 공유 실패', error);
      const status =
        typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 409) {
        alert('이미 공유된 팀입니다. 다른 팀을 선택하거나 기존 공유를 해제해주세요.');
      } else if (status === 403) {
        alert('해당 프롬프트를 공유할 권한이 없습니다.');
      } else {
        alert('프롬프트를 공유하지 못했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!promptId) {
    return (
      <div className="min-h-screen gradient-dark-bg gradient-overlay flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-semibold">선택된 프롬프트가 없습니다</h2>
          <p className="text-muted-foreground">
            홈에서 프롬프트를 선택하거나 검색 결과에서 다시 시도해주세요.
          </p>
          <Button onClick={goHome}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={goHome} className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-base sm:text-lg lg:text-xl truncate">
                  {prompt?.name || '프롬프트 로딩 중'}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  {prompt?.visibility?.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {isPromptOwner && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShareDialogOpen(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  팀에 공유
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleToggleFavorite}
                disabled={
                  isFavoriteMutating ||
                  !activeVersionNumericId ||
                  !currentUser
                }
                className={
                  isFavorite
                    ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/40'
                    : undefined
                }
              >
                {favoritesLoading && !favoriteVersionIds.size ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart
                    className={`w-4 h-4 ${isFavorite ? 'text-destructive' : 'text-muted-foreground'}`}
                    fill={isFavorite ? '#ef4444' : 'none'}
                  />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(`/editor?promptId=${promptId}&mode=new-version`)}
                disabled={!prompt}
              >
                새 버전
              </Button>
            </div>
          </div>
        </div>
      </header>

      {favoriteError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-2">
          <p className="text-xs text-destructive text-right">{favoriteError}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {errorMessage && (
          <Card className="border-destructive bg-destructive/10 mb-6">
            <CardContent className="py-4 text-sm text-destructive">
              {errorMessage}
            </CardContent>
          </Card>
        )}

        {isPromptLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            프롬프트를 불러오는 중입니다...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Prompt Content</CardTitle>
                <div className="flex flex-wrap gap-2 mt-3">
                  {prompt?.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                  {prompt && prompt.tags.length === 0 && (
                    <span className="text-xs text-muted-foreground">태그 없음</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isVersionLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    버전 정보를 불러오는 중입니다...
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                    {activeVersion?.content || '프롬프트 내용을 불러올 수 없습니다.'}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Versions</CardTitle>
              </CardHeader>
              <CardContent>
                {sortedVersions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">등록된 버전이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {sortedVersions.map((version) => (
                      <button
                        key={version.id}
                        onClick={() => setActiveVersionId(version.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          version.id === activeVersionId
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">v{version.version_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {version.created_at
                              ? new Date(version.created_at).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                        {version.commit_message && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {version.commit_message}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Run Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    모델: {getModelDisplayName(activeVersion?.model_setting?.ai_model_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">{prompt?.description}</p>
                </div>
                <Button
                  onClick={handleRun}
                  disabled={
                    isRunning ||
                    !activeVersion?.content ||
                    !activeVersion?.model_setting?.ai_model_id
                  }
                  className="w-full glow-primary bg-primary hover:bg-primary/90"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Run
                    </>
                  )}
                </Button>
                {runError && <p className="text-sm text-destructive">{runError}</p>}
                <Tabs defaultValue="output" className="w-full">
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="output">Output</TabsTrigger>
                    <TabsTrigger value="details">Analyzer</TabsTrigger>
                  </TabsList>
                  <TabsContent value="output">
                    <Textarea
                      readOnly
                      value={runOutput}
                      className="h-48 font-mono text-sm"
                      placeholder="실행 결과가 여기에 표시됩니다."
                    />
                  </TabsContent>
                  <TabsContent value="details">
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Temperature: {activeVersion?.model_setting?.temperature ?? '—'}</p>
                      <p>Max Tokens: {activeVersion?.model_setting?.max_token ?? '—'}</p>
                      <p>Top P: {activeVersion?.model_setting?.top_p ?? '—'}</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  모델 실행 결과와 분석기를 기반으로 개선 사항을 추가할 수 있도록 준비 중입니다.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mt-8 border-border">
          <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Discussion
                </CardTitle>
                {commentError && (
                  <p className="text-xs text-destructive">{commentError}</p>
                )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="의견을 남겨보세요..."
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isCommentSubmitting}
                >
                  {isCommentSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Comment
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {commentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  댓글을 불러오는 중입니다...
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">첫 번째 댓글을 남겨보세요.</p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border border-border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {comment.user?.display_name || comment.user?.userid || '사용자'}
                      </span>
                      <div className="flex items-center gap-2">
                        <span>
                          {comment.created_at
                            ? new Date(comment.created_at).toLocaleString()
                            : ''}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive px-2 py-0 h-6"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>팀에 프롬프트 공유</DialogTitle>
            <DialogDescription>
              선택한 팀 워크스페이스에 이 프롬프트를 공유합니다. 팀 멤버들이 볼 수 있게 됩니다.
            </DialogDescription>
          </DialogHeader>
          {isShareLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              워크스페이스를 불러오는 중입니다...
            </div>
          ) : shareWorkspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              공유 가능한 워크스페이스가 없습니다. 팀을 만들거나 초대를 받아주세요.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>워크스페이스</Label>
                <Select
                  value={selectedWorkspaceId ? String(selectedWorkspaceId) : undefined}
                  onValueChange={(value) => setSelectedWorkspaceId(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="워크스페이스 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {shareWorkspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={String(workspace.id)}>
                        {workspace.name} ({workspace.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>권한</Label>
                <Select value={shareRole} onValueChange={(value) => setShareRole(value as WorkspaceRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">보기 전용</SelectItem>
                    <SelectItem value="editor">편집 가능</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)} disabled={isSharing}>
              취소
            </Button>
            <Button
              onClick={handleSharePrompt}
              disabled={isSharing || !selectedWorkspaceId || shareWorkspaces.length === 0}
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  공유 중...
                </>
              ) : (
                '공유하기'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
