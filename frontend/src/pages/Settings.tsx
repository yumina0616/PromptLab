import { useState, useEffect } from 'react';
import { ArrowLeft, User, Bell, Shield, Trash2, Mail } from 'lucide-react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store/useAppStore';
import { changePassword } from '@/lib/api/k/auth';
import * as settingsApi from '@/lib/api/k/settings';
import * as notificationsApi from '@/lib/api/k/notifications';
import * as userApi from '@/lib/api/k/user';
import type { ProfileSettings, PrivacySettings, EnvironmentSettings } from '@/types/settings';
import type { NotificationSettings } from '@/types/notifications';

export function Settings() {
  const navigate = useNavigate();
  const currentUser = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);

  // Profile settings state
  const [profileSettings, setProfileSettings] = useState<ProfileSettings | null>(null);
  const [profileData, setProfileData] = useState({
    userid: '',
    displayName: '',
    bio: '',
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

  // Environment settings state
  const [environmentSettings, setEnvironmentSettings] = useState<EnvironmentSettings | null>(null);
  const [isUpdatingEnvironment, setIsUpdatingEnvironment] = useState(false);

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email change modal state
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState('');
  const [emailToken, setEmailToken] = useState('');
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Account deletion state (password verification)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // Load all settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [profile, privacy, environment, notifications] = await Promise.all([
          settingsApi.getProfileSettings(),
          settingsApi.getPrivacySettings(),
          settingsApi.getEnvironmentSettings(),
          notificationsApi.getNotificationSettings(),
        ]);

        setProfileSettings(profile);
        setProfileData({
          userid: profile.userid,
          displayName: profile.display_name,
          bio: profile.bio,
        });

        setPrivacySettings(privacy);
        setEnvironmentSettings(environment);
        setNotificationSettings(notifications);
      } catch (error) {
        console.error('Failed to load settings:', error);
        alert('설정을 불러오는데 실패했습니다.');
      }
    };

    loadSettings();
  }, []);

  // Profile update handler
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsUpdatingProfile(true);
    try {
      await settingsApi.updateProfileSettings({
        userid: profileData.userid !== profileSettings?.userid ? profileData.userid : undefined,
        display_name: profileData.displayName,
        bio: profileData.bio,
      });

      alert('프로필이 성공적으로 업데이트되었습니다.');

      // Reload profile settings
      const updated = await settingsApi.getProfileSettings();
      setProfileSettings(updated);
      setProfileData({
        userid: updated.userid,
        displayName: updated.display_name,
        bio: updated.bio,
      });
    } catch (error) {
      console.error('Profile update error:', error);
      alert('프로필 업데이트에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });

      alert('비밀번호가 성공적으로 변경되었습니다.');

      // 폼 초기화
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      alert('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Email change - Step 1: Request
  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail) {
      alert('새 이메일을 입력해주세요.');
      return;
    }

    setIsChangingEmail(true);
    try {
      await settingsApi.requestEmailChange({ new_email: newEmail });
      alert('확인 이메일이 발송되었습니다. 메일함을 확인해주세요.');
      setEmailChangeStep(2);
    } catch (error) {
      console.error('Email change request error:', error);
      alert('이메일 변경 요청에 실패했습니다.');
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Email change - Step 2: Confirm
  const handleEmailChangeConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailToken) {
      alert('토큰을 입력해주세요.');
      return;
    }

    setIsChangingEmail(true);
    try {
      await settingsApi.confirmEmailChange({ token: emailToken });
      alert('이메일이 성공적으로 변경되었습니다.');

      // Reset and close
      setEmailChangeOpen(false);
      setEmailChangeStep(1);
      setNewEmail('');
      setEmailToken('');

      // Reload profile
      const updated = await settingsApi.getProfileSettings();
      setProfileSettings(updated);
    } catch (error) {
      console.error('Email change confirm error:', error);
      alert('이메일 변경 확정에 실패했습니다. 토큰을 확인해주세요.');
    } finally {
      setIsChangingEmail(false);
    }
  };

  // Privacy settings update handler
  const handlePrivacyUpdate = async (field: keyof PrivacySettings, value: any) => {
    if (!privacySettings) return;

    setIsUpdatingPrivacy(true);
    try {
      await settingsApi.updatePrivacySettings({
        [field]: value,
      });

      // Update local state
      setPrivacySettings({
        ...privacySettings,
        [field]: value,
      });
    } catch (error) {
      console.error('Privacy update error:', error);
      alert('설정 업데이트에 실패했습니다.');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  // Environment settings update handler
  const handleEnvironmentUpdate = async (field: keyof EnvironmentSettings, value: any) => {
    if (!environmentSettings) return;

    setIsUpdatingEnvironment(true);
    try {
      await settingsApi.updateEnvironmentSettings({
        [field]: value,
      });

      // Update local state
      setEnvironmentSettings({
        ...environmentSettings,
        [field]: value,
      });

      alert('설정이 업데이트되었습니다.');
    } catch (error) {
      console.error('Environment update error:', error);
      alert('설정 업데이트에 실패했습니다.');
    } finally {
      setIsUpdatingEnvironment(false);
    }
  };

  // Notification settings update handler
  const handleNotificationUpdate = async (field: keyof NotificationSettings, value: any) => {
    if (!notificationSettings) return;

    setIsUpdatingNotifications(true);
    try {
      const updated = await notificationsApi.updateNotificationSettings({
        [field]: value,
      });

      // Update local state with full response
      setNotificationSettings(updated);
    } catch (error) {
      console.error('Notification update error:', error);
      alert('알림 설정 업데이트에 실패했습니다.');
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  // Account deletion with password verification (User API)
  const handleAccountDeletionRequest = () => {
    setDeleteDialogOpen(true);
  };

  // 계정 삭제: 비밀번호로 확인 후 삭제
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== '계정 삭제') {
      alert('확인 문구를 정확히 입력해주세요.');
      return;
    }

    if (!currentPassword) {
      alert('현재 비밀번호를 입력해주세요.');
      return;
    }

    setIsDeletingAccount(true);
    try {
      // 현재 비밀번호를 verification_token으로 전송
      await userApi.deleteAccount(currentUser.userid, {
        verification_token: currentPassword,
      });

      alert('계정이 성공적으로 삭제되었습니다.');

      // Close dialog and logout
      setDeleteDialogOpen(false);
      await logout();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Account deletion error:', error);
      alert('계정 삭제에 실패했습니다. 비밀번호를 확인해주세요.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // 삭제 다이얼로그 닫기
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteConfirmation('');
    setCurrentPassword('');
  };

  if (!profileSettings || !privacySettings || !environmentSettings || !notificationSettings) {
    return (
      <div className="min-h-screen gradient-dark-bg gradient-overlay flex items-center justify-center">
        <p className="text-muted-foreground">설정 로딩 중...</p>
      </div>
    );
  }

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
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">사용자명</Label>
                    <Input
                      id="username"
                      value={profileData.userid}
                      onChange={(e) => setProfileData({ ...profileData, userid: e.target.value })}
                      disabled={isUpdatingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">표시 이름</Label>
                    <Input
                      id="name"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData({ ...profileData, displayName: e.target.value })}
                      required
                      disabled={isUpdatingProfile}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email"
                        type="email"
                        value={profileSettings.email}
                        disabled
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEmailChangeOpen(true)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        변경
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">소개</Label>
                    <Input
                      id="bio"
                      placeholder="자신에 대해 소개해주세요..."
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      disabled={isUpdatingProfile}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={isUpdatingProfile}
                  >
                    {isUpdatingProfile ? '저장 중...' : '변경사항 저장'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>비밀번호 변경</CardTitle>
                <CardDescription>
                  계정 보안을 위해 비밀번호를 업데이트하세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">현재 비밀번호</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                      disabled={isChangingPassword}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">새 비밀번호</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      disabled={isChangingPassword}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">새 비밀번호 확인</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                      disabled={isChangingPassword}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? '변경 중...' : '비밀번호 업데이트'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>환경 설정</CardTitle>
                <CardDescription>
                  테마, 언어, 시간대를 설정하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>테마</Label>
                  <Select
                    value={environmentSettings.theme}
                    onValueChange={(value) => handleEnvironmentUpdate('theme', value)}
                    disabled={isUpdatingEnvironment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">시스템 설정</SelectItem>
                      <SelectItem value="light">라이트</SelectItem>
                      <SelectItem value="dark">다크</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>언어</Label>
                  <Select
                    value={environmentSettings.language}
                    onValueChange={(value) => handleEnvironmentUpdate('language', value)}
                    disabled={isUpdatingEnvironment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>시간대</Label>
                  <Select
                    value={environmentSettings.timezone}
                    onValueChange={(value) => handleEnvironmentUpdate('timezone', value)}
                    disabled={isUpdatingEnvironment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Seoul">서울 (UTC+9)</SelectItem>
                      <SelectItem value="America/New_York">뉴욕 (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">런던 (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  <Switch
                    checked={notificationSettings.email_comment}
                    onCheckedChange={(checked) => handleNotificationUpdate('email_comment', checked)}
                    disabled={isUpdatingNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>스타 & 포크</Label>
                    <p className="text-sm text-muted-foreground">
                      프롬프트에 스타나 포크가 달릴 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_star_fork}
                    onCheckedChange={(checked) => handleNotificationUpdate('email_star_fork', checked)}
                    disabled={isUpdatingNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>새 팔로워</Label>
                    <p className="text-sm text-muted-foreground">
                      누군가 나를 팔로우할 때 알림을 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_follower}
                    onCheckedChange={(checked) => handleNotificationUpdate('email_follower', checked)}
                    disabled={isUpdatingNotifications}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>주간 다이제스트</Label>
                    <p className="text-sm text-muted-foreground">
                      주간 인기 프롬프트 요약을 받습니다
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings.email_weekly_digest}
                    onCheckedChange={(checked) => handleNotificationUpdate('email_weekly_digest', checked)}
                    disabled={isUpdatingNotifications}
                  />
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
                  <Switch
                    checked={notificationSettings.push_enable}
                    onCheckedChange={(checked) => handleNotificationUpdate('push_enable', checked)}
                    disabled={isUpdatingNotifications}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>설정 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  마지막 업데이트: {new Date(notificationSettings.updated_at).toLocaleString()}
                </p>
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
                  <Switch
                    checked={privacySettings.is_profile_public}
                    onCheckedChange={(checked) => handlePrivacyUpdate('is_profile_public', checked)}
                    disabled={isUpdatingPrivacy}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>이메일 표시</Label>
                    <p className="text-sm text-muted-foreground">
                      프로필에 이메일 주소를 표시합니다
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.show_email}
                    onCheckedChange={(checked) => handlePrivacyUpdate('show_email', checked)}
                    disabled={isUpdatingPrivacy}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>활동 상태</Label>
                    <p className="text-sm text-muted-foreground">
                      PromptLab에서 활동 중임을 표시합니다
                    </p>
                  </div>
                  <Switch
                    checked={privacySettings.show_activity_status}
                    onCheckedChange={(checked) => handlePrivacyUpdate('show_activity_status', checked)}
                    disabled={isUpdatingPrivacy}
                  />
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
                  <Select
                    value={privacySettings.default_prompt_visibility}
                    onValueChange={(value) => handlePrivacyUpdate('default_prompt_visibility', value)}
                    disabled={isUpdatingPrivacy}
                  >
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
                <div className="text-sm text-muted-foreground">
                  데이터 내보내기 기능은 아직 제공되지 않습니다. 필요한 항목은 직접 복사해 보관해 주세요.
                </div>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-destructive/10"
                  onClick={handleAccountDeletionRequest}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  계정 삭제
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Email Change Modal */}
      <Dialog open={emailChangeOpen} onOpenChange={setEmailChangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>이메일 변경</DialogTitle>
            <DialogDescription>
              {emailChangeStep === 1
                ? '새 이메일 주소를 입력하세요. 확인 메일이 발송됩니다.'
                : '이메일로 받은 토큰을 입력하세요.'}
            </DialogDescription>
          </DialogHeader>

          {emailChangeStep === 1 ? (
            <form onSubmit={handleEmailChangeRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">새 이메일</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  required
                  disabled={isChangingEmail}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailChangeOpen(false)}
                  disabled={isChangingEmail}
                >
                  취소
                </Button>
                <Button type="submit" disabled={isChangingEmail}>
                  {isChangingEmail ? '발송 중...' : '확인 메일 발송'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={handleEmailChangeConfirm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-token">확인 토큰</Label>
                <Input
                  id="email-token"
                  value={emailToken}
                  onChange={(e) => setEmailToken(e.target.value)}
                  placeholder="eml_01HF..."
                  required
                  disabled={isChangingEmail}
                />
                <p className="text-xs text-muted-foreground">
                  {newEmail}(으)로 발송된 메일에서 토큰을 확인하세요.
                </p>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEmailChangeStep(1);
                    setEmailToken('');
                  }}
                  disabled={isChangingEmail}
                >
                  이전
                </Button>
                <Button type="submit" disabled={isChangingEmail}>
                  {isChangingEmail ? '확정 중...' : '이메일 변경 확정'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Account Deletion Dialog (password verification) */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleCloseDeleteDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
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
                disabled={isDeletingAccount}
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
                disabled={isDeletingAccount}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDeleteDialog}
                disabled={isDeletingAccount}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmation !== '계정 삭제' || !currentPassword}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeletingAccount ? '삭제 중...' : '계정 영구 삭제'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
