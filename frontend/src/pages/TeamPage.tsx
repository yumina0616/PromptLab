import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Star, Trash2, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceDetail,
  getWorkspaceMembers,
  getWorkspaceSharedPrompts,
  sendWorkspaceInvite,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  getWorkspaceInvites,
} from '@/lib/api/k/workspaces';
import type {
  WorkspaceSummary,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceSharedPrompt,
  WorkspaceInvite,
  WorkspaceRole,
} from '@/types/workspace';
const roleLabelMap: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  member: '멤버',
  editor: '에디터',
  viewer: '뷰어',
};

const roleBadgeVariant = (role: string) => {
  if (role === 'owner' || role === 'admin') return 'default';
  if (role === 'editor') return 'secondary';
  return 'outline';
};

const roleOptions: WorkspaceRole[] = ['viewer', 'editor', 'admin'];

export function TeamPage() {
  const navigate = useNavigate();
  const setSelectedPromptId = useAppStore((state) => state.setSelectedPromptId);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceSummary | null>(null);
  const [workspaceDetail, setWorkspaceDetail] = useState<WorkspaceDetail | null>(null);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [workspacePrompts, setWorkspacePrompts] = useState<WorkspaceSharedPrompt[]>([]);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [workspaceInvites, setWorkspaceInvites] = useState<WorkspaceInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    description: ''
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>('viewer');
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [memberActionUserId, setMemberActionUserId] = useState<number | null>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const openPromptEditor = () => {
    setSelectedPromptId(null);
    if (selectedWorkspace) {
      navigate(`/editor?workspaceId=${selectedWorkspace.id}`);
    } else {
      navigate('/editor');
    }
  };

  const loadWorkspaces = useCallback(async () => {
    setIsListLoading(true);
    setErrorMessage(null);
    try {
      const response = await getMyWorkspaces({ limit: 30 });
      setWorkspaces(response.items);
    } catch (error) {
      console.error('워크스페이스 목록을 불러오지 못했습니다.', error);
      setErrorMessage('워크스페이스 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsListLoading(false);
    }
  }, []);

  const loadWorkspaceInvites = useCallback(async (workspaceId: number) => {
    setInvitesLoading(true);
    try {
      const response = await getWorkspaceInvites(workspaceId);
      setWorkspaceInvites(response.items);
    } catch (error) {
      console.error('초대 목록을 불러오지 못했습니다.', error);
      setErrorMessage('초대 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setInvitesLoading(false);
    }
  }, []);

  const loadWorkspaceDetail = useCallback(async (workspaceId: number) => {
    setIsDetailLoading(true);
    setErrorMessage(null);
    try {
      const [detail, membersResponse, promptsResponse] = await Promise.all([
        getWorkspaceDetail(workspaceId),
        getWorkspaceMembers(workspaceId),
        getWorkspaceSharedPrompts(workspaceId, { limit: 12 }),
      ]);

      setWorkspaceDetail(detail);
      setWorkspaceMembers(membersResponse.items);
      setWorkspacePrompts(promptsResponse.items);
      await loadWorkspaceInvites(workspaceId);
    } catch (error) {
      console.error('워크스페이스 상세를 불러오지 못했습니다.', error);
      setErrorMessage('워크스페이스 상세 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsDetailLoading(false);
    }
  }, [loadWorkspaceInvites]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (selectedWorkspace) {
      loadWorkspaceDetail(selectedWorkspace.id);
    }
  }, [selectedWorkspace, loadWorkspaceDetail]);

  const handleCreateTeam = async () => {
    if (!newTeamData.name.trim()) return;
    setIsCreatingWorkspace(true);
    try {
      await createWorkspace({
        name: newTeamData.name.trim(),
        kind: 'team',
        description: newTeamData.description || undefined,
      });
      setIsCreateTeamModalOpen(false);
      setNewTeamData({ name: '', description: '' });
      await loadWorkspaces();
    } catch (error) {
      console.error('팀을 생성하지 못했습니다.', error);
      setErrorMessage('팀 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleSendInvite = async () => {
    if (!selectedWorkspace || !inviteEmail.trim()) return;
    setInviteStatus(null);
    setIsSendingInvite(true);
    try {
      await sendWorkspaceInvite(selectedWorkspace.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteStatus('초대가 완료되었습니다. 팀원 목록을 확인하세요.');
      await loadWorkspaceDetail(selectedWorkspace.id);
    } catch (error) {
      console.error('초대 메일을 보내지 못했습니다.', error);
      setInviteStatus('초대 이메일 전송에 실패했습니다.');
    } finally {
      setIsSendingInvite(false);
    }
  };
  
  const handleMemberRoleChange = async (userId: number, newRole: WorkspaceRole) => {
    if (!selectedWorkspace) return;
    if (workspaceDetail?.created_by?.id === userId) {
      setErrorMessage('팀 생성자의 역할은 변경할 수 없습니다.');
      return;
    }
    setMemberActionUserId(userId);
    try {
      await updateWorkspaceMemberRole(selectedWorkspace.id, userId, newRole);
      setWorkspaceMembers((prev) =>
        prev.map((member) =>
          member.user.id === userId ? { ...member, role: newRole } : member
        )
      );
    } catch (error) {
      console.error('멤버 역할 변경 실패', error);
      setErrorMessage('멤버 역할을 변경하지 못했습니다.');
    } finally {
      setMemberActionUserId(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!selectedWorkspace) return;
    if (workspaceDetail?.created_by?.id === userId) {
      setErrorMessage('팀 생성자는 팀에서 제거할 수 없습니다.');
      return;
    }
    setMemberActionUserId(userId);
    try {
      await removeWorkspaceMember(selectedWorkspace.id, userId);
      setWorkspaceMembers((prev) => prev.filter((member) => member.user.id !== userId));
    } catch (error) {
      console.error('멤버 제거 실패', error);
      setErrorMessage('멤버를 제거하지 못했습니다.');
    } finally {
      setMemberActionUserId(null);
    }
  };

  const renderPromptCard = (prompt: WorkspaceSharedPrompt) => (
    <Card
      key={`${prompt.prompt.id}-${prompt.latest_version?.id ?? 'latest'}`}
      className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
      onClick={() => {
        setSelectedPromptId(prompt.prompt.id);
        navigate(`/repository?id=${prompt.prompt.id}`);
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">{prompt.prompt.owner.userid}</Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {prompt.stars}
            </span>
          </div>
        </div>
        <CardTitle className="text-base">{prompt.prompt.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {prompt.tags.length ? prompt.tags.slice(0, 3).join(', ') : '태그 없음'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">by @{prompt.prompt.owner.userid}</span>
          <span className="text-xs text-accent">보기 →</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderTeamCard = (workspace: WorkspaceSummary) => {
    const descriptionSnippet =
      workspace.description?.trim() || (workspace.slug ? `slug: ${workspace.slug}` : '팀 정보 없음');

    return (
      <Card
        key={workspace.id}
        className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
        onClick={() => setSelectedWorkspace(workspace)}
      >
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-xl">{workspace.name.slice(0, 2).toUpperCase()}</span>
            </div>
            <Badge variant={roleBadgeVariant(workspace.role)} className="text-xs">
              {roleLabelMap[workspace.role] ?? workspace.role}
            </Badge>
          </div>
          <CardTitle>{workspace.name}</CardTitle>
          <CardDescription className="line-clamp-2 text-xs">{descriptionSnippet}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Users className="w-4 h-4" />
            {workspace.kind === 'personal' ? '개인 워크스페이스' : '팀 워크스페이스'}
          </p>
        </CardContent>
      </Card>
    );
  };

  const memberCount = workspaceDetail?.members?.count ?? workspaceMembers.length;
  const promptCount = workspaceDetail?.prompts?.count ?? workspacePrompts.length;
  const selectedWorkspaceName = selectedWorkspace?.name ?? '';

  // Team list view
  if (!selectedWorkspace) {
    return (
      <>
        <div className="min-h-screen gradient-dark-bg gradient-overlay">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="flex-shrink-0">
                  <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-lg lg:text-xl">팀</h1>
                    <p className="text-xs text-muted-foreground truncate">{workspaces.length}개 팀에 참여 중</p>
                  </div>
                </div>
              </div>
              <Button 
                className="glow-primary bg-primary hover:bg-primary/90 flex-shrink-0"
                onClick={() => setIsCreateTeamModalOpen(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">새 팀 만들기</span>
              </Button>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Info Banner */}
            <Card className="mb-6 sm:mb-8 border-primary/20 bg-primary/5">
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 text-sm sm:text-base">팀 협업</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      여러 팀에 참여하여 팀원들과 프롬프트를 공유하고 관리할 수 있습니다. 모든 팀 프롬프트는 팀원들에게만 공개됩니다.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Teams Grid */}
            {errorMessage && (
              <Card className="border-destructive mb-4 bg-destructive/10">
                <CardContent className="py-4 text-sm text-destructive">
                  {errorMessage}
                </CardContent>
              </Card>
            )}

            <div className="mb-4 sm:mb-6 flex items-center justify-between">
              <h3 className="text-base sm:text-lg">내 팀</h3>
              {isListLoading && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  불러오는 중
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {workspaces.map(renderTeamCard)}
            </div>

            {/* Empty State */}
            {!isListLoading && workspaces.length === 0 && (
              <Card className="border-border">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="mb-2">아직 참여한 팀이 없습니다</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    새로운 팀을 만들거나 초대 코드로 팀에 참여하세요
                  </p>
                  <Button 
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setIsCreateTeamModalOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    팀 만들기
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Create Team Modal */}
        <Dialog open={isCreateTeamModalOpen} onOpenChange={setIsCreateTeamModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>새 팀 만들기</DialogTitle>
                <DialogDescription>
                  팀원들과 프롬프트를 공유하고 협업할 새로운 팀을 만드세요
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">팀 이름 *</Label>
                <Input 
                  id="team-name"
                  placeholder="예: AI 개발팀"
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({...newTeamData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description">팀 설명</Label>
                <Input 
                  id="team-description"
                  placeholder="팀에 대한 간단한 설명을 입력하세요"
                  value={newTeamData.description}
                  onChange={(e) => setNewTeamData({...newTeamData, description: e.target.value})}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsCreateTeamModalOpen(false);
                    setNewTeamData({ name: '', description: '' });
                  }}
                >
                  취소
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleCreateTeam}
                  disabled={!newTeamData.name.trim() || isCreatingWorkspace}
                >
                  {isCreatingWorkspace ? '만드는 중...' : '팀 만들기'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Team detail view with prompts
  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 mb-3 sm:mb-0">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" onClick={() => {
                setSelectedWorkspace(null);
                setWorkspaceDetail(null);
                setWorkspaceMembers([]);
                setWorkspacePrompts([]);
                setInviteStatus(null);
              }} className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-sm sm:text-base">{selectedWorkspaceName.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-xl truncate">{selectedWorkspaceName}</h1>
                  <p className="text-xs text-muted-foreground truncate">
                    {memberCount}명 · {promptCount}개 프롬프트
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setIsManageModalOpen(true)}
                size="sm"
                className="hidden sm:flex"
              >
                <Users className="w-4 h-4 mr-2" />
                팀 관리
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsManageModalOpen(true)}
                size="icon"
                className="sm:hidden"
              >
                <Users className="w-4 h-4" />
              </Button>
              <Button
                className="glow-primary bg-primary hover:bg-primary/90"
                onClick={openPromptEditor}
                size="sm"
              >
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">새 팀 프롬프트</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Team Description */}
        <Card className="mb-6 sm:mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-4 sm:pt-6">
            {isDetailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                팀 정보를 불러오는 중입니다...
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">
                {workspaceDetail?.description || '팀 소개가 아직 등록되지 않았습니다.'}
              </p>
            )}
          </CardContent>
        </Card>

        {errorMessage && (
          <Card className="border-destructive mb-4 bg-destructive/10">
            <CardContent className="py-4 text-sm text-destructive">
              {errorMessage}
            </CardContent>
          </Card>
        )}

        {/* Prompts Grid */}
        <div className="mb-4 sm:mb-6">
          <h3 className="mb-3 sm:mb-4 text-base sm:text-lg">팀 프롬프트</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {workspacePrompts.map(renderPromptCard)}
        </div>

        {/* Empty State */}
        {!isDetailLoading && workspacePrompts.length === 0 && (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="mb-2">아직 팀 프롬프트가 없습니다</h3>
              <p className="text-sm text-muted-foreground mb-4">
                팀을 위한 첫 프롬프트를 만들어보세요
              </p>
              <Button className="bg-primary hover:bg-primary/90" onClick={openPromptEditor}>
                <Plus className="w-4 h-4 mr-2" />
                첫 팀 프롬프트 만들기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manage Team Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="w-[min(720px,100%)] mx-auto px-4 py-6 rounded-[28px] shadow-2xl bg-gradient-to-br from-card via-card/80 to-card/60 ring-1 ring-border/70">
          <DialogHeader>
            <DialogTitle>팀 관리</DialogTitle>
            <DialogDescription>
              새로운 멤버를 초대하거나 기존 팀원을 관리하세요
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="members" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                현재 멤버
              </TabsTrigger>
              <TabsTrigger value="invite">
                <Plus className="w-4 h-4 mr-2" />
                멤버 초대
              </TabsTrigger>
            </TabsList>

            {/* Current Members Tab */}
            <TabsContent value="members" className="space-y-4 mt-4">
              <div className="space-y-3">
                {workspaceMembers.map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex-wrap gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.user.display_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {member.user.display_name || member.user.userid}
                          </span>
                          {member.role === 'owner' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          <Badge variant={roleBadgeVariant(member.role)} className="text-xs">
                            {roleLabelMap[member.role] ?? member.role}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">@{member.user.userid}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={member.role}
                        disabled={
                          memberActionUserId === member.user.id ||
                          workspaceDetail?.created_by?.id === member.user.id
                        }
                        onValueChange={(value) =>
                          handleMemberRoleChange(member.user.id, value as WorkspaceRole)
                        }
                      >
                        <SelectTrigger className="w-28 text-xs">
                          <SelectValue placeholder="역할" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((role) => (
                            <SelectItem key={role} value={role}>
                              {roleLabelMap[role] ?? role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {workspaceDetail?.created_by?.id !== member.user.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveMember(member.user.id)}
                          disabled={memberActionUserId === member.user.id}
                        >
                          {memberActionUserId === member.user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Invite Members Tab */}
            <TabsContent value="invite" className="space-y-4 mt-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base">최근 초대/가입 기록</CardTitle>
                <CardDescription>초대를 보내면 바로 팀에 추가됩니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {invitesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    초대를 불러오는 중입니다...
                  </div>
                ) : workspaceInvites.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    아직 초대를 통해 합류한 팀원이 없습니다.
                  </p>
                ) : (
                  workspaceInvites.map((invite) => (
                    <div
                      key={invite.token}
                      className="border border-border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{invite.invited_email}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {roleLabelMap[invite.role] ?? invite.role}
                          </Badge>
                          <span className="uppercase text-green-600">accepted</span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        팀원으로 자동 추가되었습니다.
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">이메일로 초대</CardTitle>
                  <CardDescription>이메일 주소와 역할을 지정해 초대를 보냅니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">이메일 주소</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">역할</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) => setInviteRole(value as WorkspaceRole)}
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue placeholder="역할 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {roleLabelMap[role] ?? role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={handleSendInvite}
                    disabled={!inviteEmail.trim() || isSendingInvite}
                  >
                    {isSendingInvite ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      '초대장 보내기'
                    )}
                  </Button>
                  {inviteStatus && (
                    <p className="text-xs text-muted-foreground">{inviteStatus}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
