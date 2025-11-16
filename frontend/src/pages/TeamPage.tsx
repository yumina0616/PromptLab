import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Plus, Link as LinkIcon, Copy, Star, GitFork, Trash2, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockPrompts } from '@/lib/mock-data';
import type { Prompt } from '@/lib/mock-data';
import { useAppStore } from '@/store/useAppStore';

interface Team {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  promptCount: number;
  role: 'Owner' | 'Admin' | 'Member';
  createdAt: string;
  avatar: string;
}

export function TeamPage() {
  const navigate = useNavigate();
  const setSelectedPrompt = useAppStore((state) => state.setSelectedPrompt);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('TEAM-XK9P-2M4L');
  const [copied, setCopied] = useState(false);
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    description: ''
  });

  // Mock teams data
  const myTeams: Team[] = [
    {
      id: '1',
      name: 'AI 개발팀',
      description: '머신러닝 및 AI 프롬프트 개발을 위한 팀',
      memberCount: 8,
      promptCount: 24,
      role: 'Owner',
      createdAt: '2025-09-01',
      avatar: 'AI'
    },
    {
      id: '2',
      name: '마케팅팀',
      description: '마케팅 콘텐츠 제작을 위한 프롬프트 라이브러리',
      memberCount: 5,
      promptCount: 12,
      role: 'Admin',
      createdAt: '2025-09-15',
      avatar: 'MK'
    },
    {
      id: '3',
      name: '디자인팀',
      description: 'UI/UX 디자인 관련 프롬프트 모음',
      memberCount: 6,
      promptCount: 18,
      role: 'Member',
      createdAt: '2025-10-01',
      avatar: 'DS'
    }
  ];

  // Mock team prompts
  const teamPrompts = selectedTeam ? mockPrompts.slice(0, selectedTeam.promptCount) : [];

  // Mock team members
  const teamMembers = [
    {
      id: '1',
      name: '김개발',
      username: 'dev_master',
      avatar: 'DM',
      role: 'Owner',
      joinedAt: '2025-09-01'
    },
    {
      id: '2',
      name: '이디자인',
      username: 'design_guru',
      avatar: 'DG',
      role: 'Admin',
      joinedAt: '2025-09-15'
    },
    {
      id: '3',
      name: '박마케터',
      username: 'marketing_pro',
      avatar: 'MP',
      role: 'Member',
      joinedAt: '2025-10-01'
    },
    {
      id: '4',
      name: '최데이터',
      username: 'data_scientist',
      avatar: 'DS',
      role: 'Member',
      joinedAt: '2025-10-10'
    }
  ];

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(`https://promptlab.com/invite/${inviteCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateNewCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const parts = Array(3).fill(0).map(() => 
      Array(4).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('')
    );
    setInviteCode(`TEAM-${parts.join('-')}`);
  };

  const renderPromptCard = (prompt: Prompt) => (
    <Card 
      key={prompt.id}
      className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
      onClick={() => {
        setSelectedPrompt(prompt);
        navigate('/repository');
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">{prompt.category}</Badge>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {prompt.stars}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3 h-3" />
              {prompt.forks}
            </span>
          </div>
        </div>
        <CardTitle className="text-base">{prompt.title}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">{prompt.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">by @{prompt.author.username}</span>
          <span className="text-xs text-accent">보기 →</span>
        </div>
      </CardContent>
    </Card>
  );

  const renderTeamCard = (team: Team) => (
    <Card 
      key={team.id}
      className="card-hover cursor-pointer border-border hover:border-primary active:scale-[0.98]"
      onClick={() => setSelectedTeam(team)}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-3">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary text-xl">{team.avatar}</span>
          </div>
          <Badge variant={team.role === 'Owner' ? 'default' : 'secondary'} className="text-xs">
            {team.role === 'Owner' ? '소유자' : team.role === 'Admin' ? '관리자' : '멤버'}
          </Badge>
        </div>
        <CardTitle>{team.name}</CardTitle>
        <CardDescription className="line-clamp-2">{team.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {team.memberCount}명
          </span>
          <span>{team.promptCount}개 프롬프트</span>
        </div>
      </CardContent>
    </Card>
  );

  // Team list view
  if (!selectedTeam) {
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
                    <p className="text-xs text-muted-foreground truncate">{myTeams.length}개 팀에 참여 중</p>
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
            <div className="mb-4 sm:mb-6">
              <h3 className="mb-3 sm:mb-4 text-base sm:text-lg">내 팀</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {myTeams.map(renderTeamCard)}
            </div>

            {/* Empty State */}
            {myTeams.length === 0 && (
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
                  onClick={() => {
                    // TODO: Create team logic
                    console.log('Creating team:', newTeamData);
                    setIsCreateTeamModalOpen(false);
                    setNewTeamData({ name: '', description: '' });
                  }}
                  disabled={!newTeamData.name.trim()}
                >
                  팀 만들기
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
              <Button variant="ghost" size="icon" onClick={() => setSelectedTeam(null)} className="flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-sm sm:text-base">{selectedTeam.avatar}</span>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg lg:text-xl truncate">{selectedTeam.name}</h1>
                  <p className="text-xs text-muted-foreground truncate">{selectedTeam.memberCount}명 · {selectedTeam.promptCount}개 프롬프트</p>
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
                onClick={() => {
                  setSelectedPrompt(undefined);
                  navigate('/editor');
                }}
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
            <p className="text-xs sm:text-sm text-muted-foreground">{selectedTeam.description}</p>
          </CardContent>
        </Card>

        {/* Prompts Grid */}
        <div className="mb-4 sm:mb-6">
          <h3 className="mb-3 sm:mb-4 text-base sm:text-lg">팀 프롬프트</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {teamPrompts.map(renderPromptCard)}
        </div>

        {/* Empty State */}
        {teamPrompts.length === 0 && (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="mb-2">아직 팀 프롬프트가 없습니다</h3>
              <p className="text-sm text-muted-foreground mb-4">
                팀을 위한 첫 프롬프트를 만들어보세요
              </p>
              <Button 
                className="bg-primary hover:bg-primary/90"
                onClick={() => {
                  setSelectedPrompt(undefined);
                  navigate('/editor');
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                첫 팀 프롬프트 만들기
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manage Team Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-2xl">
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
                <LinkIcon className="w-4 h-4 mr-2" />
                멤버 초대
              </TabsTrigger>
            </TabsList>

            {/* Current Members Tab */}
            <TabsContent value="members" className="space-y-4 mt-4">
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {member.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name}</span>
                          {member.role === 'Owner' && (
                            <Crown className="w-4 h-4 text-yellow-500" />
                          )}
                          <Badge variant={member.role === 'Owner' ? 'default' : 'secondary'} className="text-xs">
                            {member.role === 'Owner' ? '소유자' : member.role === 'Admin' ? '관리자' : '멤버'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">@{member.username} · {member.joinedAt} 가입</p>
                      </div>
                    </div>
                    {member.role !== 'Owner' && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Invite Members Tab */}
            <TabsContent value="invite" className="space-y-4 mt-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">초대 링크</CardTitle>
                  <CardDescription>
                    팀에 초대하고 싶은 사람들과 이 링크를 공유하세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>초대 코드</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={`https://promptlab.com/invite/${inviteCode}`} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleCopyInviteCode}
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleGenerateNewCode}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    새 코드 생성
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base">이메일로 초대</CardTitle>
                  <CardDescription>
                    이메일 주소로 직접 초대장을 보내세요
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">이메일 주소</Label>
                    <Input 
                      id="invite-email"
                      type="email" 
                      placeholder="colleague@example.com"
                    />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90">
                    초대장 보내기
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
