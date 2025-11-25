import { useEffect, useState } from 'react';
import { ArrowLeft, Settings, Star, Code2, LogOut, Loader2, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/useAppStore';
import * as userApi from '@/lib/api/k/user';

export function UserProfile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 프로필 편집 다이얼로그 상태
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    display_name: '',
    bio: '',
    email: '',
    profile_image_url: '',
  });

  // 계정 삭제 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  const logout = useAppStore((state) => state.logout);
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const currentUser = useAppStore((state) => state.user);

  // 프로필 관련 상태
  const viewedProfile = useAppStore((state) => state.viewedProfile);
  const userPrompts = useAppStore((state) => state.userPrompts);
  const userFavorites = useAppStore((state) => state.userFavorites);
  const userActivity = useAppStore((state) => state.userActivity);

  // 프로필 관련 액션
  const fetchUserProfile = useAppStore((state) => state.fetchUserProfile);
  const fetchUserPrompts = useAppStore((state) => state.fetchUserPrompts);
  const fetchUserFavorites = useAppStore((state) => state.fetchUserFavorites);
  const fetchUserActivity = useAppStore((state) => state.fetchUserActivity);
  const updateUserProfile = useAppStore((state) => state.updateUserProfile);

  // 프로필 데이터 로드
  useEffect(() => {
    if (!currentUser) return;

    const loadProfileData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        await Promise.all([
          fetchUserProfile(currentUser.userid),
          fetchUserPrompts(currentUser.userid),
          fetchUserFavorites(currentUser.userid),
          fetchUserActivity(currentUser.userid),
        ]);
      } catch (err) {
        console.error('Failed to load profile data:', err);
        setError('프로필 정보를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [currentUser, fetchUserProfile, fetchUserPrompts, fetchUserFavorites, fetchUserActivity]);

  // 사용자 정보가 없으면 로그인 페이지로 리다이렉트
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // viewedProfile이 없으면 currentUser로 fallback
  const user = viewedProfile || {
    userid: currentUser.userid,
    display_name: currentUser.display_name,
    profile_image_url: currentUser.profile_image_url,
    bio: '',
    stats: {
      prompts: 0,
      stars: 0,
    },
  };

  // 프로필 편집 다이얼로그 열기
  const handleOpenEditDialog = () => {
    // 현재 프로필 정보로 폼 초기화
    setEditFormData({
      display_name: user.display_name,
      bio: user.bio || '',
      email: viewedProfile?.email || currentUser.email,
      profile_image_url: user.profile_image_url || '',
    });
    setEditError(null);
    setIsEditDialogOpen(true);
  };

  // 프로필 수정 제출
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setIsSaving(true);

    try {
      const payload = {
        display_name: editFormData.display_name,
        bio: editFormData.bio ?? '',
        profile_image_url: editFormData.profile_image_url?.trim()
          ? editFormData.profile_image_url.trim()
          : undefined,
      };

      await updateUserProfile(currentUser.userid, payload);

      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setEditError('프로필 수정에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // 계정 삭제: 비밀번호로 확인 후 삭제
  const handleDeleteAccount = async () => {
    // 확인 문구가 정확히 입력되었는지 확인
    if (deleteConfirmation !== '계정 삭제') {
      setError('확인 문구를 정확히 입력해주세요.');
      return;
    }

    if (!currentPassword) {
      setError('현재 비밀번호를 입력해주세요.');
      return;
    }

    try {
      setIsDeleting(true);

      // 현재 비밀번호를 verification_token으로 전송
      await userApi.deleteAccount(currentUser.userid, {
        verification_token: currentPassword,
      });

      alert('계정이 성공적으로 삭제되었습니다.');

      // 계정 삭제 성공 시 로그아웃 처리
      await logout();
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Failed to delete account:', err);
      setError('계정 삭제에 실패했습니다. 비밀번호를 확인해주세요.');
    } finally {
      setIsDeleting(false);
    }
  };

  // 삭제 다이얼로그 닫기 (초기화)
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmation('');
    setCurrentPassword('');
    setError(null);
  };

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="min-h-screen gradient-dark-bg gradient-overlay flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">프로필을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <h1 className="text-base sm:text-lg lg:text-xl">프로필</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {}
        {error && (
          <Card className="mb-6 border-destructive/50 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {}
        <Card className="mb-6 sm:mb-8 border-border">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
              {}
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-primary/20 glow-primary">
                {user.profile_image_url && (
                  <AvatarImage src={user.profile_image_url} alt={user.display_name} />
                )}
                <AvatarFallback className="bg-primary text-white text-xl sm:text-2xl">
                  {user.display_name ? user.display_name.slice(0, 2).toUpperCase() : '??'}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 w-full sm:w-auto">
                <h2 className="mb-1 text-xl sm:text-2xl">{user.display_name}</h2>
                <p className="text-muted-foreground mb-2 sm:mb-3 text-sm sm:text-base">@{user.userid}</p>
                {user.bio && (
                  <p className="text-xs sm:text-sm mb-3 sm:mb-4">{user.bio}</p>
                )}

                <div className="flex items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-xl sm:text-2xl">{user.stats?.prompts || 0}</span>
                    <p className="text-xs text-muted-foreground">Prompts</p>
                  </div>
                  <div className="w-px h-8 sm:h-10 bg-border"></div>
                  <div>
                    <span className="text-xl sm:text-2xl">{user.stats?.stars || 0}</span>
                    <p className="text-xs text-muted-foreground">Stars</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={handleOpenEditDialog} size="sm" className="flex-1 sm:flex-none">
                  <Edit className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">프로필 편집</span>
                </Button>
                <Button variant="outline" onClick={() => navigate('/settings')} size="sm" className="flex-1 sm:flex-none">
                  <Settings className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">설정</span>
                </Button>
                <Button
                  onClick={() => {
                    setSelectedPromptId(null);
                    navigate('/editor');
                  }}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <Code2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">새 프롬프트</span>
                </Button>
                <Button variant="outline" onClick={logout} size="sm" className="flex-1 sm:flex-none">
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">로그아웃</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[min(420px,100%)] mx-auto px-4 py-6 rounded-[28px] shadow-2xl bg-card ring-1 ring-border/30">
          <div className="mx-auto w-full max-w-sm space-y-4">
            <DialogHeader>
              <DialogTitle>프로필 편집</DialogTitle>
              <DialogDescription>
                프로필 정보를 수정하세요. 변경사항은 즉시 반영됩니다.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                  <p className="text-sm text-destructive">{editError}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="display_name">표시 이름</Label>
                <Input
                  id="display_name"
                  value={editFormData.display_name ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, display_name: e.target.value })}
                  required
                  disabled={isSaving}
                  placeholder="홍길동"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">소개</Label>
                <Textarea
                  id="bio"
                  value={editFormData.bio ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                  disabled={isSaving}
                  placeholder="자기소개를 입력하세요..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile_image_url">프로필 이미지 URL</Label>
                <Input
                  id="profile_image_url"
                  type="url"
                  value={editFormData.profile_image_url ?? ''}
                  onChange={(e) => setEditFormData({ ...editFormData, profile_image_url: e.target.value })}
                  disabled={isSaving}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  프로필 이미지 URL을 입력하세요 (선택사항)
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isSaving}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    '저장'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
        </Dialog>

        {/* Tabs */}
        <Tabs defaultValue="my-prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
            <TabsTrigger value="my-prompts" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">내 프롬프트</span>
              <span className="sm:hidden">내 것</span> ({userPrompts?.items.length || 0})
            </TabsTrigger>
            <TabsTrigger value="starred" className="text-xs sm:text-sm">
              스타 ({userFavorites?.items.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-prompts" className="space-y-3 sm:space-y-4">
            {userPrompts && userPrompts.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPrompts.items.map((prompt) => (
                  <Card
                    key={prompt.id}
                    className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
                    onClick={() => {
                      setSelectedPromptId(prompt.id);
                      navigate(`/repository?id=${prompt.id}`);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">{prompt.visibility}</Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {prompt.stats?.stars ?? 0}
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-base">{prompt.name}</CardTitle>
                      <CardDescription className="text-sm line-clamp-2">{prompt.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(prompt.updated_at).toLocaleDateString('ko-KR')} 업데이트
                        </span>
                        <span className="text-xs text-accent">보기 →</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>아직 작성한 프롬프트가 없습니다</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="starred" className="space-y-3 sm:space-y-4">
            {userFavorites && userFavorites.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userFavorites.items.map((favorite) => (
                  <Card
                    key={favorite.prompt_version_id}
                    className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
                    onClick={() => {
                      setSelectedPromptId(favorite.prompt.id);
                      navigate(`/repository?id=${favorite.prompt.id}&version=${favorite.prompt_version_id}`);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">v{favorite.version_number}</Badge>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Star className="w-3 h-3 fill-primary text-primary" />
                        </div>
                      </div>
                      <CardTitle className="text-base">{favorite.prompt.name}</CardTitle>
                      <CardDescription className="text-sm">
                        by @{favorite.owner.userid}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(favorite.starred_at).toLocaleDateString('ko-KR')} 스타
                        </span>
                        <span className="text-xs text-accent">보기 →</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>아직 스타한 프롬프트가 없습니다</p>
              </div>
            )}
          </TabsContent>

        </Tabs>

        {/* Activity Section */}
        <Card className="mt-6 border-border">
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
          </CardHeader>
          <CardContent>
            {userActivity && userActivity.items.length > 0 ? (
              <div className="space-y-4">
                {userActivity.items.map((activity) => {
                  const actionLabels: Record<string, string> = {
                    created_prompt: '생성',
                    starred_prompt: '스타',
                    updated_prompt: '업데이트',
                    created_version: '버전 생성',
                  };

                  const timeAgo = (timestamp: string) => {
                    const now = new Date();
                    const then = new Date(timestamp);
                    const diffInMs = now.getTime() - then.getTime();
                    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                    const diffInDays = Math.floor(diffInHours / 24);

                    if (diffInHours < 1) return '방금 전';
                    if (diffInHours < 24) return `${diffInHours}시간 전`;
                    if (diffInDays < 7) return `${diffInDays}일 전`;
                    return then.toLocaleDateString('ko-KR');
                  };

                  return (
                    <div key={activity.id} className="flex items-center gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {activity.action === 'created_prompt' && <Code2 className="w-5 h-5 text-primary" />}
                        {activity.action === 'starred_prompt' && <Star className="w-5 h-5 text-primary" />}
                        {activity.action === 'updated_prompt' && <Code2 className="w-5 h-5 text-primary" />}
                        {activity.action === 'created_version' && <Code2 className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="text-muted-foreground">{actionLabels[activity.action] || activity.action}</span>{' '}
                          <span className="font-medium">{activity.entity_type} #{activity.entity_id}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{timeAgo(activity.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Code2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>최근 활동이 없습니다</p>
              </div>
            )}
          </CardContent>
        </Card>

        {}
        <Card className="mt-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              위험 구역
            </CardTitle>
            <CardDescription>
              아래 작업은 되돌릴 수 없습니다. 신중하게 진행하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">계정 삭제</p>
                <p className="text-sm text-muted-foreground">
                  모든 데이터가 영구적으로 삭제됩니다
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                계정 삭제
              </Button>
            </div>
          </CardContent>
        </Card>

        {}
        <Dialog open={isDeleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
          <DialogContent className="w-[min(420px,100%)] mx-auto px-4 py-6 rounded-[28px] shadow-2xl bg-card ring-1 ring-border/30">
          <div className="mx-auto w-full max-w-sm space-y-4">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                계정 삭제 확인
              </DialogTitle>
              <DialogDescription>
                이 작업은 되돌릴 수 없습니다. 계정과 모든 데이터가 영구적으로 삭제됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-md p-4">
                <p className="text-sm text-destructive font-medium mb-2">다음 데이터가 삭제됩니다:</p>
                <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                  <li>모든 프롬프트 및 버전</li>
                  <li>즐겨찾기 및 포크</li>
                  <li>활동 로그</li>
                  <li>프로필 정보</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">
                  확인을 위해 "<span className="font-medium">계정 삭제</span>"를 입력하세요
                </Label>
                <Input
                  id="delete-confirmation"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="계정 삭제"
                  disabled={isDeleting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="current-password">현재 비밀번호</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  disabled={isDeleting}
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-md p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDeleteDialog}
                  disabled={isDeleting}
                >
                  취소
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || deleteConfirmation !== '계정 삭제' || !currentPassword}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      계정 영구 삭제
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
        </Dialog>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full mt-6 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          onClick={() => {
            logout();
            navigate('/auth', { replace: true });
          }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          로그아웃
        </Button>
      </div>
    </div>
  );
}
