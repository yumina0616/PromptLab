import { ArrowLeft, User, Bell, Shield, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Settings() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen gradient-dark-bg gradient-overlay">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>프로필로 돌아가기</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2>설정</h2>
          <p className="text-muted-foreground mt-2">
            계정 설정 및 환경설정을 관리하세요
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full max-w-2xl">
            <TabsTrigger value="account">
              <User className="w-4 h-4 mr-2" />
              계정
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="w-4 h-4 mr-2" />
              알림
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="w-4 h-4 mr-2" />
              개인정보
            </TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>프로필 정보</CardTitle>
                <CardDescription>
                  개인 정보 및 프로필 세부사항을 업데이트하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">사용자명</Label>
                  <Input id="username" defaultValue="dev_master" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">표시 이름</Label>
                  <Input id="name" defaultValue="김개발" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" defaultValue="dev@promptlab.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">소개</Label>
                  <Input id="bio" placeholder="자신에 대해 소개해주세요..." />
                </div>
                <Button className="bg-primary hover:bg-primary/90">변경사항 저장</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>비밀번호 변경</CardTitle>
                <CardDescription>
                  계정 보안을 위해 비밀번호를 업데이트하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">현재 비밀번호</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">새 비밀번호</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button className="bg-primary hover:bg-primary/90">비밀번호 업데이트</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>이메일 알림</CardTitle>
                <CardDescription>
                  이메일로 받고 싶은 알림을 선택하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>새 댓글</Label>
                    <p className="text-sm text-muted-foreground">
                      프롬프트에 새로운 댓글이 달릴 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>스타 & 포크</Label>
                    <p className="text-sm text-muted-foreground">
                      프롬프트에 스타나 포크가 달릴 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>새 팔로워</Label>
                    <p className="text-sm text-muted-foreground">
                      누군가 나를 팔로우할 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>주간 다이제스트</Label>
                    <p className="text-sm text-muted-foreground">
                      주간 인기 프롬프트 요약을 받습니다
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>푸시 알림</CardTitle>
                <CardDescription>
                  브라우저 푸시 알림을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>푸시 알림 활성화</Label>
                    <p className="text-sm text-muted-foreground">
                      브라우저에서 실시간 알림을 받습니다
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>프로필 공개 설정</CardTitle>
                <CardDescription>
                  프로필 및 프롬프트 공개 범위를 설정하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>공개 프로필</Label>
                    <p className="text-sm text-muted-foreground">
                      모든 사람에게 프로필을 공개합니다
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>이메일 표시</Label>
                    <p className="text-sm text-muted-foreground">
                      프로필에 이메일 주소를 표시합니다
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>활동 상태</Label>
                    <p className="text-sm text-muted-foreground">
                      PromptLab에서 활동 중임을 표시합니다
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>데이터 & 개인정보</CardTitle>
                <CardDescription>
                  데이터 및 개인정보 환경설정을 관리하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>기본 프롬프트 공개 설정</Label>
                  <Select defaultValue="public">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">공개</SelectItem>
                      <SelectItem value="unlisted">링크만</SelectItem>
                      <SelectItem value="private">비공개</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <Button variant="outline" className="w-full">
                  내 데이터 다운로드
                </Button>
                <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4 mr-2" />
                  계정 삭제
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
