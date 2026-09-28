'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Building2,
  Printer,
  Receipt,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Percent,
  Sparkles,
  Loader2,
  LayoutGrid,
  Columns2,
  Maximize2,
  Check,
  Mail,
  Key,
  Send,
  Shield,
  Eye,
  EyeOff,
  Smartphone,
  KeyRound,
  Trash2,
  Copy,
  Download,
  RotateCw,
  RefreshCw,
  User,
  ShieldCheck,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { Button, Badge, Dialog } from '@/components/ui';
import {
  updateStoreProfile,
  clearApplicationCacheAction,
  type StoreProfileInput,
} from '@/actions/settings-actions';
import { clearClientStorageCaches } from '@/hooks/use-cached-resource';
import { testSmtpConnectionAction } from '@/actions/email-actions';
import { ProductTypesSettings } from '@/components/admin/product-types-settings';
import { authClient } from '@/lib/auth-client';
import {
  getUserAccountStatusAction,
  setUserPasswordAction,
  deleteUserAccountAction,
  toggleEmailOtpTwoFactorAction,
  updateTwoFactorMethodAction,
  resetTwoFactorAction,
  type UserAccountStatus,
} from '@/actions/account-actions';
import type { StoreProfile, ReceiptType } from '@/db/schema';

interface SettingsViewProps {
  initialProfile: StoreProfile;
}

type TabType =
  | 'general'
  | 'print'
  | 'pos-layout'
  | 'products'
  | 'email'
  | 'account'
  | 'notifications'
  | 'system';

const VALID_TABS: TabType[] = [
  'general',
  'print',
  'pos-layout',
  'products',
  'email',
  'account',
  'notifications',
  'system',
];

export function SettingsView({ initialProfile }: SettingsViewProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlTab = searchParams.get('tab') as TabType | null;

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (urlTab && VALID_TABS.includes(urlTab)) return urlTab;
    return 'general';
  });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (urlTab && VALID_TABS.includes(urlTab) && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [urlTab, activeTab]);

  // Saved baseline tracking for dirty state checking
  const [savedProfile, setSavedProfile] = useState<StoreProfile>(initialProfile);

  // Unsaved changes navigation guard state
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabType | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Form State
  const [storeName, setStoreName] = useState(initialProfile.storeName || 'Santhosh Optical Center');
  const [gstin, setGstin] = useState(initialProfile.gstin || '29AABCS1429B1Z8');
  const [phone, setPhone] = useState(initialProfile.phone || '+91 98765 43210');
  const [address, setAddress] = useState(initialProfile.address || '123 Optical Plaza, MG Road, Bengaluru - 560001');
  const [defaultTaxRate, setDefaultTaxRate] = useState(
    initialProfile.defaultTaxRate || '18.00'
  );
  const [receiptType, setReceiptType] = useState<ReceiptType>(
    initialProfile.receiptType || 'THERMAL_80MM'
  );
  const [defaultPosLayout, setDefaultPosLayout] = useState<'adaptive' | 'dense' | 'split'>(
    (initialProfile as any).defaultPosLayout || 'adaptive'
  );
  const [enableGst, setEnableGst] = useState<boolean>(
    (initialProfile as any).enableGst ?? true
  );

  // SMTP Configuration State
  const [smtpHost, setSmtpHost] = useState(initialProfile.smtpHost || 'smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(initialProfile.smtpPort || 587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(initialProfile.smtpSecure ?? false);
  const [smtpUser, setSmtpUser] = useState(initialProfile.smtpUser || '');
  const [smtpPass, setSmtpPass] = useState(initialProfile.smtpPass ? '••••••••••••••••' : '');
  const [smtpFromEmail, setSmtpFromEmail] = useState(initialProfile.smtpFromEmail || '');
  const [smtpFromName, setSmtpFromName] = useState(initialProfile.smtpFromName || 'OptixOS Eyecare');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testRecipient, setTestRecipient] = useState(initialProfile.smtpUser || 'support@optixos.com');
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearAllCaches = async () => {
    setClearingCache(true);
    try {
      clearClientStorageCaches();
      const res = await clearApplicationCacheAction();
      if (res.success) {
        toast.success('All client & server caches purged successfully! Reloading...');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast.warning(res.message);
      }
    } catch {
      toast.error('Failed to clear application caches');
    } finally {
      setClearingCache(false);
    }
  };

  // Dirty State Calculation
  const isGeneralDirty =
    storeName.trim() !== (savedProfile.storeName || '') ||
    (gstin.trim() || '') !== (savedProfile.gstin || '') ||
    phone.trim() !== (savedProfile.phone || '') ||
    address.trim() !== (savedProfile.address || '') ||
    defaultTaxRate.trim() !== (savedProfile.defaultTaxRate || '18.00');

  const isEmailDirty =
    smtpHost.trim() !== (savedProfile.smtpHost || 'smtp.gmail.com') ||
    Number(smtpPort) !== (savedProfile.smtpPort || 587) ||
    smtpSecure !== (savedProfile.smtpSecure ?? false) ||
    smtpUser.trim() !== (savedProfile.smtpUser || '') ||
    (smtpPass.trim() !== '' && smtpPass !== '••••••••••••••••') ||
    smtpFromEmail.trim() !== (savedProfile.smtpFromEmail || '') ||
    smtpFromName.trim() !== (savedProfile.smtpFromName || 'OptixOS Eyecare');

  const isCurrentTabDirty =
    activeTab === 'general' ? isGeneralDirty : activeTab === 'email' ? isEmailDirty : false;

  // Window beforeunload prompt if user attempts to close/reload page with unsaved edits
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGeneralDirty || isEmailDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGeneralDirty, isEmailDirty]);

  const handleTestSmtp = async () => {
    if (!testRecipient.trim() || !testRecipient.includes('@')) {
      toast.error('Please enter a valid recipient email address for testing.');
      return;
    }

    setIsTestingSmtp(true);
    try {
      const res = await testSmtpConnectionAction(testRecipient.trim());
      if (res.success) {
        toast.success('SMTP Verification Succeeded!', {
          description: res.message,
        });
      } else {
        toast.error('SMTP Connection Failed', {
          description: res.message,
        });
      }
    } catch (err: any) {
      toast.error('Diagnostic Test Failed', {
        description: err?.message || 'Check network connectivity or credentials.',
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  // ── Account & Security State ──
  const [accountStatus, setAccountStatus] = useState<UserAccountStatus | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [accountCurrentPassword, setAccountCurrentPassword] = useState('');
  const [accountNewPassword, setAccountNewPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [twoFactorMode, setTwoFactorMode] = useState<'idle' | 'totp-setup' | 'backup-codes'>('idle');
  const [totpQrDataUrl, setTotpQrDataUrl] = useState<string | null>(null);
  const [totpManualKey, setTotpManualKey] = useState<string | null>(null);
  const [backupCodesList, setBackupCodesList] = useState<string[]>([]);
  const [totpInputCode, setTotpInputCode] = useState('');
  const [activatingTotp, setActivatingTotp] = useState(false);
  const [showTotpPasswordModal, setShowTotpPasswordModal] = useState(false);
  const [totpSetupPassword, setTotpSetupPassword] = useState('');
  const [showDisable2faModal, setShowDisable2faModal] = useState(false);
  const [disable2faPassword, setDisable2faPassword] = useState('');
  const [disabling2fa, setDisabling2fa] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadAccountStatus = async () => {
    setLoadingAccount(true);
    try {
      const res = await getUserAccountStatusAction();
      if (res.success && res.account) {
        setAccountStatus(res.account);
      }
    } catch (err) {
      console.error('Failed to load user account status:', err);
    } finally {
      setLoadingAccount(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'account') {
      loadAccountStatus();
    }
  }, [activeTab]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNewPassword || accountNewPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (accountNewPassword !== accountConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await setUserPasswordAction(accountNewPassword);
      if (res.success) {
        toast.success('Account password successfully established!', {
          description: 'You can now sign in using Google OR your email and password.',
        });
        setAccountNewPassword('');
        setAccountConfirmPassword('');
        loadAccountStatus();
      } else {
        toast.error(res.error || 'Failed to establish password');
      }
    } catch {
      toast.error('Network error setting password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCurrentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!accountNewPassword || accountNewPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }
    if (accountNewPassword !== accountConfirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword: accountCurrentPassword,
        newPassword: accountNewPassword,
        revokeOtherSessions: false,
      });

      if (error) {
        toast.error(error.message || 'Failed to change password');
      } else {
        toast.success('Password changed successfully!');
        setAccountCurrentPassword('');
        setAccountNewPassword('');
        setAccountConfirmPassword('');
      }
    } catch {
      toast.error('Network error changing password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!backupCodesList.length) return;

    // Use username or email prefix for clean personal file naming
    const rawUsername = (accountStatus?.name || accountStatus?.email?.split('@')[0] || 'user')
      .toLowerCase()
      .replace(/\s+/g, '-');
    const sanitizedUsername = rawUsername.replace(/[^a-z0-9_-]/g, '-');
    const filename = `optixos-backup-codes-${sanitizedUsername}.txt`;

    const fileContent = [
      '================================================================',
      'OPTIXOS PRACTICE MANAGEMENT — TWO-FACTOR RECOVERY BACKUP CODES',
      '================================================================',
      '',
      `Account Email: ${accountStatus?.email || 'admin@optixos.com'}`,
      `User Name:     ${accountStatus?.name || 'User'}`,
      `Generated On:  ${new Date().toLocaleString()}`,
      `Platform:      OptixOS Eyecare Cloud`,
      '',
      'CRITICAL RECOVERY NOTICE:',
      '----------------------------------------------------------------',
      '1. Each of these 10 one-time backup codes can be used once to',
      '   sign in if you lose access to your Authenticator app.',
      '2. Keep this text file in an encrypted directory or secure vault.',
      '3. Never share these recovery codes with unauthorized staff.',
      '',
      'YOUR 10 ONE-TIME RECOVERY CODES:',
      '----------------------------------------------------------------',
      ...backupCodesList.map((code, idx) => `  ${String(idx + 1).padStart(2, ' ')}. ${code}`),
      '',
      '================================================================',
      'OptixOS — Domain-Engineered Optical POS & Practice System',
      '================================================================',
    ].join('\n');

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Backup codes downloaded as ${filename}`);
  };

  const executeTotpSetup = async (pwd?: string) => {
    setActivatingTotp(true);
    try {
      // Proactive cleanup: If 2FA is currently disabled, wipe any unverified or stale TOTP records first
      if (!accountStatus?.twoFactorEnabled) {
        await resetTwoFactorAction();
      }

      let res = await authClient.twoFactor.enable({
        password: pwd || undefined,
      });

      // Self-healing: If stale TOTP record exists in database, reset and retry once
      if (
        res.error &&
        (res.error.code === 'TOTP_ALREADY_ENABLED' ||
          res.error.message?.toLowerCase().includes('already enabled') ||
          res.error.message?.toLowerCase().includes('already setup'))
      ) {
        await resetTwoFactorAction();
        res = await authClient.twoFactor.enable({
          password: pwd || undefined,
        });
      }

      if (res.error) {
        toast.error(res.error.message || 'Failed to initiate Authenticator 2FA setup');
        setActivatingTotp(false);
        return;
      }

      if (res.data && 'totpURI' in res.data) {
        const qrUrl = await QRCode.toDataURL(res.data.totpURI, { width: 220, margin: 1 });
        setTotpQrDataUrl(qrUrl);
        setTotpManualKey(res.data.totpURI);
        setBackupCodesList(res.data.backupCodes || []);
        setTotpInputCode('');
        setTwoFactorMode('totp-setup');
        setShowTotpPasswordModal(false);
        setTotpSetupPassword('');
      }
    } catch (err: any) {
      toast.error('Error generating 2FA QR code');
    } finally {
      setActivatingTotp(false);
    }
  };

  const handleStartTotpSetup = async () => {
    setTotpInputCode('');
    let currentStatus = accountStatus;
    if (!currentStatus) {
      setActivatingTotp(true);
      try {
        const res = await getUserAccountStatusAction();
        if (res.success && res.account) {
          setAccountStatus(res.account);
          currentStatus = res.account;
        }
      } finally {
        setActivatingTotp(false);
      }
    }

    // If user has a password configured and hasn't entered one yet, ask for it via modal
    if (currentStatus?.hasPassword && !accountCurrentPassword) {
      setShowTotpPasswordModal(true);
      return;
    }
    await executeTotpSetup(accountCurrentPassword || undefined);
  };

  const handleConfirmTotp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!totpInputCode.trim()) return;

    setActivatingTotp(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code: totpInputCode.trim(),
      });

      if (error) {
        toast.error(error.message || 'Invalid authenticator code. Please check your app.');
      } else {
        await updateTwoFactorMethodAction('totp');
        toast.success('Authenticator App 2FA successfully verified and enabled!');
        setTotpInputCode('');
        setTwoFactorMode('backup-codes');
        loadAccountStatus();
      }
    } catch {
      toast.error('Verification failed');
    } finally {
      setActivatingTotp(false);
    }
  };

  const handleToggleEmailOtp = async (enabled: boolean) => {
    try {
      const res = await toggleEmailOtpTwoFactorAction(enabled);
      if (res.success) {
        toast.success(enabled ? 'Email OTP 2FA enabled!' : 'Email OTP 2FA disabled');
        loadAccountStatus();
      } else {
        toast.error(res.error || 'Failed to update Email OTP');
      }
    } catch {
      toast.error('Network error updating Email OTP');
    }
  };

  const executeDisable2fa = async (pwd?: string) => {
    setDisabling2fa(true);
    try {
      const { error } = await authClient.twoFactor.disable({
        password: pwd || undefined,
      });

      if (error) {
        // Fallback for email OTP or direct disable
        await toggleEmailOtpTwoFactorAction(false);
      }
      // Ensure all DB records in twoFactor table are wiped
      await resetTwoFactorAction();
      toast.success('Two-Factor Authentication disabled');
      setTwoFactorMode('idle');
      setBackupCodesList([]);
      setShowDisable2faModal(false);
      setDisable2faPassword('');
      loadAccountStatus();
    } catch {
      toast.error('Failed to disable 2FA');
    } finally {
      setDisabling2fa(false);
    }
  };

  const handleDisable2fa = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication on your account?')) {
      return;
    }

    if (accountStatus?.hasPassword && !accountCurrentPassword) {
      setShowDisable2faModal(true);
      return;
    }

    await executeDisable2fa(accountCurrentPassword || undefined);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletingAccount(true);
    try {
      const res = await deleteUserAccountAction({
        password: deletePassword,
        confirmationPhrase: deletePhrase,
      });

      if (res.success) {
        toast.success('Account successfully deleted');
        clearClientStorageCaches();
        await authClient.signOut();
        window.location.href = '/';
      } else {
        toast.error(res.error || 'Failed to delete account');
      }
    } catch {
      toast.error('Network error during account deletion');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleAutoSave = async (partial: Partial<StoreProfileInput>) => {
    startTransition(async () => {
      const payload: StoreProfileInput = {
        storeName: storeName.trim() || savedProfile.storeName || 'Santhosh Optical Center',
        gstin: gstin.trim() || savedProfile.gstin || '29AABCS1429B1Z8',
        phone: phone.trim() || savedProfile.phone || '+91 98765 43210',
        address: address.trim() || savedProfile.address || '123 Optical Plaza, MG Road, Bengaluru - 560001',
        defaultTaxRate: defaultTaxRate.trim() || savedProfile.defaultTaxRate || '18.00',
        receiptType,
        defaultPosLayout,
        enableGst: enableGst ?? true,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort) || 587,
        smtpSecure,
        smtpUser: smtpUser.trim(),
        smtpPass: smtpPass.trim(),
        smtpFromEmail: smtpFromEmail.trim(),
        smtpFromName: smtpFromName.trim(),
        ...partial,
      };

      const result = await updateStoreProfile(payload);
      if (result.success && result.data) {
        setSavedProfile(result.data);
        if (partial.receiptType) {
          toast.success('Print layout updated', {
            description: `Default format set to ${partial.receiptType === 'THERMAL_80MM' ? 'Thermal Roll (80mm)' : 'Laser A4 Invoice'}.`,
          });
        }
        if (partial.defaultPosLayout) {
          toast.success('Counter layout updated', {
            description: `Default sales layout set to ${partial.defaultPosLayout === 'adaptive' ? 'Adaptive Modes' : partial.defaultPosLayout === 'dense' ? 'Dense Split View' : 'Classic Split'}.`,
          });
        }
      } else {
        toast.error(result.error || 'Failed to auto-save preferences');
      }
    });
  };

  useEffect(() => {
    const handleNavIntercept = (e: any) => {
      if (isCurrentTabDirty) {
        e.preventDefault();
        if (e.detail?.tabKey) {
          setPendingTab(e.detail.tabKey as TabType);
        }
        if (e.detail?.href) {
          setPendingHref(e.detail.href);
        }
        setShowUnsavedModal(true);
      }
    };
    window.addEventListener('optixos:settings-nav-intercept', handleNavIntercept);
    return () => window.removeEventListener('optixos:settings-nav-intercept', handleNavIntercept);
  }, [isCurrentTabDirty]);

  const handleTabClick = (targetTab: TabType) => {
    if (targetTab === activeTab) return;
    if (isCurrentTabDirty) {
      setPendingTab(targetTab);
      setShowUnsavedModal(true);
      return;
    }
    setActiveTab(targetTab);
    router.replace(`/admin/settings?tab=${targetTab}`, { scroll: false });
  };

  const handleDiscard = () => {
    if (activeTab === 'general') {
      setStoreName(savedProfile.storeName || '');
      setGstin(savedProfile.gstin || '');
      setPhone(savedProfile.phone || '');
      setAddress(savedProfile.address || '');
      setDefaultTaxRate(savedProfile.defaultTaxRate || '18.00');
    } else if (activeTab === 'email') {
      setSmtpHost(savedProfile.smtpHost || 'smtp.gmail.com');
      setSmtpPort(savedProfile.smtpPort || 587);
      setSmtpSecure(savedProfile.smtpSecure ?? false);
      setSmtpUser(savedProfile.smtpUser || 'msanthosh9943@gmail.com');
      setSmtpPass(savedProfile.smtpPass ? '••••••••••••••••' : '');
      setSmtpFromEmail(savedProfile.smtpFromEmail || savedProfile.smtpUser || 'msanthosh9943@gmail.com');
      setSmtpFromName(savedProfile.smtpFromName || 'OptixOS Eyecare');
    }
    setShowUnsavedModal(false);
    if (pendingTab) {
      setActiveTab(pendingTab);
      router.replace(`/admin/settings?tab=${pendingTab}`, { scroll: false });
      setPendingTab(null);
    }
    if (pendingHref) {
      router.push(pendingHref);
      setPendingHref(null);
    }
    toast.info('Unsaved changes discarded');
  };

  const handleSaveAndSwitch = () => {
    handleSubmit(undefined, () => {
      setShowUnsavedModal(false);
      if (pendingTab) {
        setActiveTab(pendingTab);
        router.replace(`/admin/settings?tab=${pendingTab}`, { scroll: false });
        setPendingTab(null);
      }
      if (pendingHref) {
        router.push(pendingHref);
        setPendingHref(null);
      }
    });
  };

  const handleSubmit = (e?: React.FormEvent, onSuccessCallback?: () => void) => {
    if (e) e.preventDefault();

    if (!storeName.trim()) {
      toast.error('Store Name cannot be blank');
      return;
    }

    if (!phone.trim()) {
      toast.error('Store Phone cannot be blank');
      return;
    }

    if (!address.trim()) {
      toast.error('Store Address cannot be blank');
      return;
    }

    startTransition(async () => {
      const payload: StoreProfileInput = {
        storeName: storeName.trim(),
        gstin: gstin.trim() || null,
        phone: phone.trim(),
        address: address.trim(),
        defaultTaxRate: defaultTaxRate.trim() || '18.00',
        receiptType,
        defaultPosLayout,
        enableGst: enableGst ?? true,
        smtpHost: smtpHost.trim(),
        smtpPort: Number(smtpPort) || 587,
        smtpSecure,
        smtpUser: smtpUser.trim(),
        smtpPass: smtpPass.trim(),
        smtpFromEmail: smtpFromEmail.trim(),
        smtpFromName: smtpFromName.trim(),
      };

      const result = await updateStoreProfile(payload);

      if (result.success && result.data) {
        setSavedProfile(result.data);
        toast.success('Store profile updated successfully', {
          description: 'Your changes have been saved and applied across the system.',
        });
        if (onSuccessCallback) {
          onSuccessCallback();
        }
      } else {
        toast.error(result.error || 'Failed to update store profile');
      }
    });
  };

  return (
    <div className="flex flex-col h-full w-full p-4 md:p-6 gap-6">
      {/* ── Standardized Header Block ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Store Settings & Print Engine</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure store identity, GST credentials, tax defaults, and hardware receipt layout preferences.
          </p>
        </div>

        {/* Header Action: Auto-save badge on preference tabs vs Smart Save Button on form tabs */}
        {(activeTab === 'print' || activeTab === 'products' || activeTab === 'pos-layout') && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Auto-saves on selection</span>
          </div>
        )}

        {(activeTab === 'general' || activeTab === 'email') && (
          <Button
            type="button"
            data-testid="btn-save-settings"
            onClick={() => handleSubmit()}
            disabled={!isCurrentTabDirty || isPending}
            isLoading={isPending}
            loadingText="Saving Changes..."
            leftIcon={isCurrentTabDirty ? <Save className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            variant={isCurrentTabDirty ? 'primary' : 'outline'}
            size="sm"
          >
            {isCurrentTabDirty ? 'Save Changes' : 'All Changes Saved'}
          </Button>
        )}
      </div>

      {/* ── Active Section Header & Navigation Breadcrumb ── */}
      <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="text-foreground font-medium">
            {activeTab === 'general' && 'Store & Practice · Store Profile & Legal'}
            {activeTab === 'print' && 'Store & Practice · Hardware & Print Engine'}
            {activeTab === 'pos-layout' && 'Store & Practice · POS Viewport Layout'}
            {activeTab === 'products' && 'Catalog & Dispensing · Product Types & Workflows'}
            {activeTab === 'account' && 'Profile & Security · Account & Security'}
            {activeTab === 'email' && 'Communications & Alerts · Email & SMTP Gateway'}
            {activeTab === 'system' && 'Subscription & System · System Engine & Cache'}
          </span>
          {isCurrentTabDirty && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 text-[10px] ml-2">
              Pending Edits
            </Badge>
          )}
        </div>
      </div>

      {/* ── Tab Content Form ── */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6">
        {/* ── Tab 1: General Profile ── */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column: Store Profile Inputs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span>Store Identity & Legal Details</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Store Name */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label
                      htmlFor="input-store-name"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Store Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-store-name"
                      data-testid="input-store-name"
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="e.g. Santhosh Optical Center"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Displayed on printed receipts, laser invoices, and workshop job tickets.
                    </p>
                  </div>

                  {/* GSTIN */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-store-gstin"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      GSTIN / Tax ID
                    </label>
                    <input
                      id="input-store-gstin"
                      data-testid="input-store-gstin"
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="e.g. 29AABCS1429B1Z8"
                      maxLength={15}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      15-character Goods and Services Tax Identification Number.
                    </p>
                  </div>

                  {/* Enable GST Calculations Toggle */}
                  <div className="space-y-1.5 md:col-span-2 rounded-xl border border-border bg-muted/20 p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Store GST System &amp; Invoicing
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${enableGst ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          {enableGst ? 'GST Enabled' : 'No Tax / Composition'}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Toggle GST calculations across POS billing counters, invoices, and sales receipts.
                      </p>
                    </div>

                    <button
                      type="button"
                      data-testid="toggle-enable-gst"
                      onClick={() => {
                        const next = !enableGst;
                        setEnableGst(next);
                        handleAutoSave({ enableGst: next });
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        enableGst ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          enableGst ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-store-phone"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Contact Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id="input-store-phone"
                        data-testid="input-store-phone"
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Primary counter telephone printed on customer invoices.
                    </p>
                  </div>

                  {/* Default Tax Rate */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-store-tax-rate"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Default Tax Rate (%)
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        id="input-store-tax-rate"
                        data-testid="input-store-tax-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(e.target.value)}
                        placeholder="18.00"
                        className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Standard GST rate applied to new inventory products.
                    </p>
                  </div>

                  {/* Currency Format */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Store Currency
                    </label>
                    <div className="flex h-9 items-center px-3 rounded-lg border border-border bg-muted/40 text-xs font-semibold text-foreground">
                      <span>Indian Rupee (INR — ₹)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Decimal currency with 2-digit paise precision.
                    </p>
                  </div>

                  {/* Physical Address */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label
                      htmlFor="input-store-address"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Store Physical Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <textarea
                        id="input-store-address"
                        data-testid="input-store-address"
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 123 Optical Plaza, MG Road, Bengaluru - 560001"
                        className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Full dispensary address displayed in the invoice header and printouts.
                    </p>
                  </div>
                </div>
              </div>

              {/* Application Cache & Local Storage Management Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Application Cache &amp; Storage Reset
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Purge stale browser localStorage caches, SWR telemetry keys, and server-side Redis memory caches across your practice.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="btn-clear-application-cache"
                    onClick={handleClearAllCaches}
                    disabled={clearingCache}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${clearingCache ? 'animate-spin' : ''}`} />
                    <span>{clearingCache ? 'Purging Caches...' : 'Clear All Caches'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Real-Time Receipt & Invoice Header Specimen */}
            <div className="lg:col-span-5 space-y-4">
              {/* Thermal Receipt Live Mockup */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-foreground">Live Receipt Header Preview</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-bold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync
                  </span>
                </div>

                <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 font-mono text-[11px] space-y-1.5 text-center text-foreground">
                  <div className="font-bold text-sm tracking-wide text-foreground uppercase">
                    {storeName.trim() || 'SANTHOSH OPTICAL CENTER'}
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-tight">
                    {address.trim() || '123 Optical Plaza, MG Road, Bengaluru - 560001'}
                  </div>
                  <div className="text-[10px] text-muted-foreground pt-0.5">
                    GSTIN: <span className="font-semibold text-foreground">{gstin.trim() || '29AABCS1429B1Z8'}</span> • Tel: <span className="font-semibold text-foreground">{phone.trim() || '+91 98765 43210'}</span>
                  </div>
                  <div className="border-t border-dashed border-border my-2 pt-2 text-[10px] flex justify-between text-muted-foreground">
                    <span>Tax: GST {defaultTaxRate || '18.00'}%</span>
                    <span>Paper: {receiptType === 'A4_INVOICE' ? 'A4 Sheet' : '80mm Thermal'}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground italic">
                    *** Authentic Printed Customer Header ***
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Updates in real time as you configure your dispensary identity. This branding appears across customer receipts, workshop slips, and PDF invoices.
                </div>
              </div>

              {/* Where details appear card */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-4 w-4" />
                  <span>Where Store Information Is Used</span>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>80mm Thermal Receipts</strong>: Store header, GSTIN, and support phone.</li>
                  <li><strong>A4 Laser Tax Invoices</strong>: Two-column tax compliance header.</li>
                  <li><strong>Workshop Job Tickets</strong>: Internal lens/frame reference header.</li>
                  <li><strong>Customer SMS / Email</strong>: Dispensary signature and contact.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Print Configuration ── */}
        {activeTab === 'print' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column: Radio Cards */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Printer className="h-4 w-4 text-blue-500" />
                    <span>Default Receipt & Invoice Output</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose the default print format triggered when clerks click &ldquo;Print Receipt&rdquo; at the counter or in the patient history.
                  </p>
                </div>

                {/* Radio Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  {/* 1. Thermal 80mm Card */}
                  <label
                    data-testid="card-receipt-thermal"
                    onClick={() => {
                      if (receiptType !== 'THERMAL_80MM') {
                        setReceiptType('THERMAL_80MM');
                        handleAutoSave({ receiptType: 'THERMAL_80MM' });
                      }
                    }}
                    className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                      receiptType === 'THERMAL_80MM'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            receiptType === 'THERMAL_80MM'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            Thermal Roll (80mm)
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Width: 72mm printable
                          </div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="receipt-type"
                        data-testid="receipt-type-thermal"
                        value="THERMAL_80MM"
                        checked={receiptType === 'THERMAL_80MM'}
                        onChange={() => {
                          setReceiptType('THERMAL_80MM');
                          handleAutoSave({ receiptType: 'THERMAL_80MM' });
                        }}
                        className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Designed for high-velocity thermal receipt printers (EPSON, TVS, Star Micronics). Produces compact, itemized slips with GST splits and advance dues.
                    </p>
                    {receiptType === 'THERMAL_80MM' && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Default Print Format (Saved)</span>
                      </div>
                    )}
                  </label>

                  {/* 2. Laser A4 Card */}
                  <label
                    data-testid="card-receipt-a4"
                    onClick={() => {
                      if (receiptType !== 'A4_INVOICE') {
                        setReceiptType('A4_INVOICE');
                        handleAutoSave({ receiptType: 'A4_INVOICE' });
                      }
                    }}
                    className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                      receiptType === 'A4_INVOICE'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            receiptType === 'A4_INVOICE'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            Laser Tax Invoice (A4)
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            Standard A4 Sheet
                          </div>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="receipt-type"
                        data-testid="receipt-type-a4"
                        value="A4_INVOICE"
                        checked={receiptType === 'A4_INVOICE'}
                        onChange={() => {
                          setReceiptType('A4_INVOICE');
                          handleAutoSave({ receiptType: 'A4_INVOICE' });
                        }}
                        className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Formal full-page invoice layout featuring high-contrast border collapse tables, HSN schedule, bank details, and an authorized signature block.
                    </p>
                    {receiptType === 'A4_INVOICE' && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Default Print Format (Saved)</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Hardware Guidance Callout */}
                <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Workshop Lab Slip Behavior</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Workshop job slips triggered from the Lab Orders Kanban automatically render using the specialized <span className="font-semibold text-foreground">Workshop Lab Slip</span> layout with full clinical OD/OS refraction metrics and complete financial data redaction, regardless of the customer invoice default.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Hardware & Paper Specifications */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Printer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Hardware Integration Standards</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">OptixOS Spooler</span>
                </div>

                <div className="space-y-3 text-xs text-muted-foreground">
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/60 space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Thermal 80mm ESC/POS</span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Plug &amp; Play</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Compatible with EPSON TM-T82, TVS RP-3200, Posiflex, NGX, and Star Micronics. Uses CSS continuous height media queries with zero margin cropping.
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 border border-border/60 space-y-1.5">
                    <div className="font-semibold text-foreground flex items-center justify-between">
                      <span>Laser / Inkjet A4 Sheets</span>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono">B2B Ready</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Standard ISO 216 (210 × 297 mm) format. Generates two copies: Customer Original and Dispensary Auditor Copy with HSN/SAC summary.
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 border border-border/60 space-y-1.5">
                    <div className="font-semibold text-foreground">Cash Drawer Pulse Trigger</div>
                    <p className="text-[11px] leading-relaxed">
                      RJ11 24V pulse signal supported through compatible ESC/POS receipt printer kick-out pins upon transaction completion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: POS Viewport & Counter Layout ── */}
        {activeTab === 'pos-layout' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-blue-500" />
                    <span>Default Sales Counter Viewport</span>
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the initial counter orientation and panel arrangement presented when opening POS Billing (/pos/new-bill).
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  {/* Adaptive Card */}
                  <label
                    data-testid="pos-layout-adaptive-card"
                    onClick={() => {
                      if (defaultPosLayout !== 'adaptive') {
                        setDefaultPosLayout('adaptive');
                        handleAutoSave({ defaultPosLayout: 'adaptive' });
                      }
                    }}
                    className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                      defaultPosLayout === 'adaptive'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            defaultPosLayout === 'adaptive'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Maximize2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">Adaptive Responsive Viewport</span>
                            <Badge variant="outline" className="text-[10px]">Recommended</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">Dynamic focus switching with F4 keyboard shortcuts</span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="pos-layout"
                        checked={defaultPosLayout === 'adaptive'}
                        onChange={() => {
                          setDefaultPosLayout('adaptive');
                          handleAutoSave({ defaultPosLayout: 'adaptive' });
                        }}
                        className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Automatically expands refraction workspace during clinical exam and slides into cart focus for high-speed checkout.
                    </p>
                    {defaultPosLayout === 'adaptive' && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Active Default Layout</span>
                      </div>
                    )}
                  </label>

                  {/* Dense Card */}
                  <label
                    data-testid="pos-layout-dense-card"
                    onClick={() => {
                      if (defaultPosLayout !== 'dense') {
                        setDefaultPosLayout('dense');
                        handleAutoSave({ defaultPosLayout: 'dense' });
                      }
                    }}
                    className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                      defaultPosLayout === 'dense'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            defaultPosLayout === 'dense'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <LayoutGrid className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">Dense High-Velocity Grid</span>
                            <Badge variant="outline" className="text-[10px]">High Volume</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">All panels pinned in compact layout</span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="pos-layout"
                        checked={defaultPosLayout === 'dense'}
                        onChange={() => {
                          setDefaultPosLayout('dense');
                          handleAutoSave({ defaultPosLayout: 'dense' });
                        }}
                        className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Optimized for busy retail counters: patient details, refraction, catalog and live cart visible simultaneously.
                    </p>
                    {defaultPosLayout === 'dense' && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Active Default Layout</span>
                      </div>
                    )}
                  </label>

                  {/* Split Card */}
                  <label
                    data-testid="pos-layout-split-card"
                    onClick={() => {
                      if (defaultPosLayout !== 'split') {
                        setDefaultPosLayout('split');
                        handleAutoSave({ defaultPosLayout: 'split' });
                      }
                    }}
                    className={`flex flex-col rounded-xl border p-4 cursor-pointer transition relative ${
                      defaultPosLayout === 'split'
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            defaultPosLayout === 'split'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Columns2 className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground">Classic Dual-Pane Split</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Balanced 50/50 clinical and retail viewport</span>
                        </div>
                      </div>
                      <input
                        type="radio"
                        name="pos-layout"
                        checked={defaultPosLayout === 'split'}
                        onChange={() => {
                          setDefaultPosLayout('split');
                          handleAutoSave({ defaultPosLayout: 'split' });
                        }}
                        className="h-4 w-4 text-blue-600 cursor-pointer mt-1"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      Traditional optical POS workflow with refraction and prescription history on the left, and inventory search with payment on the right.
                    </p>
                    {defaultPosLayout === 'split' && (
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Active Default Layout</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Viewport Guidance */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Viewport Keyboard Shortcuts</span>
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">F1</span>
                    <span>New Order / Clear Active Patient</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">F3</span>
                    <span>Search Inventory Catalog</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">F4</span>
                    <span>Toggle Split / Cart Focus Viewport</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">F10</span>
                    <span>Jump to Cash / UPI Payment Tender</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 3: Dynamic Product Categorization & Workflow Builder ── */}
        {activeTab === 'products' && (
          <ProductTypesSettings />
        )}

        {/* ── Tab 4: Email & SMTP Configuration ── */}
        {activeTab === 'email' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column: SMTP Server Configuration */}
            <div className="lg:col-span-7 space-y-4">
              {/* SMTP Server Configuration Card */}
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>Gmail SMTP Mail Server Configuration</span>
                  </h2>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <Shield className="h-3 w-3" />
                    TLS / SSL Secure Relay
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* SMTP Host */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-smtp-host"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      SMTP Host / Server <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-smtp-host"
                      data-testid="input-smtp-host"
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="text-[10px] text-muted-foreground">Default: smtp.gmail.com</p>
                  </div>

                  {/* SMTP Port & Security Protocol */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="select-smtp-port-security"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Port & Security Protocol <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="select-smtp-port-security"
                      data-testid="select-smtp-port-security"
                      value={`${smtpPort}-${smtpSecure}`}
                      onChange={(e) => {
                        const [port, secure] = e.target.value.split('-');
                        setSmtpPort(Number(port));
                        setSmtpSecure(secure === 'true');
                      }}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <option value="587-false">Port 587 — STARTTLS / TLS (Recommended for Gmail)</option>
                      <option value="465-true">Port 465 — Direct SSL / TLS</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      {smtpPort === 587
                        ? 'Port 587 initiates opportunistic STARTTLS encryption.'
                        : 'Port 465 enforces immediate TLS socket connection.'}
                    </p>
                  </div>

                  {/* Username / From Email */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-smtp-user"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Username / Full Gmail Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="input-smtp-user"
                      data-testid="input-smtp-user"
                      type="email"
                      value={smtpUser}
                      onChange={(e) => {
                        setSmtpUser(e.target.value);
                        if (!smtpFromEmail || smtpFromEmail === smtpUser) {
                          setSmtpFromEmail(e.target.value);
                        }
                        if (!testRecipient || testRecipient === smtpUser) {
                          setTestRecipient(e.target.value);
                        }
                      }}
                      placeholder="msanthosh9943@gmail.com"
                      required
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="text-[10px] text-muted-foreground">The authenticating Gmail account.</p>
                  </div>

                  {/* Sender Display Name */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-smtp-from-name"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Sender Display Name
                    </label>
                    <input
                      id="input-smtp-from-name"
                      data-testid="input-smtp-from-name"
                      type="text"
                      value={smtpFromName}
                      onChange={(e) => setSmtpFromName(e.target.value)}
                      placeholder="OptixOS Eyecare"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="text-[10px] text-muted-foreground">Appears in customer email headers.</p>
                  </div>

                  {/* Sender From Email Address */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-smtp-from-email"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      From Address
                    </label>
                    <input
                      id="input-smtp-from-email"
                      data-testid="input-smtp-from-email"
                      type="email"
                      value={smtpFromEmail}
                      onChange={(e) => setSmtpFromEmail(e.target.value)}
                      placeholder="msanthosh9943@gmail.com"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="text-[10px] text-muted-foreground">Recipient-facing return envelope.</p>
                  </div>

                  {/* 16-Character Google App Password */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="input-smtp-pass"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between"
                    >
                      <span>16-Char Google App Password <span className="text-red-500">*</span></span>
                      <span className="text-[10px] font-semibold text-amber-500 lowercase">(not gmail login pass)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="input-smtp-pass"
                        data-testid="input-smtp-pass"
                        type={showSmtpPass ? 'text' : 'password'}
                        value={smtpPass}
                        onChange={(e) => setSmtpPass(e.target.value)}
                        placeholder="Enter 16-character App Password"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-xs font-mono font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title={showSmtpPass ? 'Hide password' : 'Show password'}
                      >
                        {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Generated via Google Security &gt; App passwords. Masked when saved.
                    </p>
                  </div>
                </div>
              </div>

              {/* Google App Password Step-by-Step Guide */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                  <Key className="h-4 w-4" />
                  <span>How to Generate a 16-Character Google App Password</span>
                </div>
                <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Open your Google Account at{' '}
                    <a
                      href="https://myaccount.google.com/security"
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      myaccount.google.com/security
                    </a>{' '}
                    and ensure <strong>2-Step Verification</strong> is turned <strong>ON</strong>.
                  </li>
                  <li>
                    Search for <strong>&quot;App passwords&quot;</strong> in the search bar or under <em>How you sign in to Google</em>.
                  </li>
                  <li>
                    Create an app password with the custom name <strong>&quot;OptixOS&quot;</strong>.
                  </li>
                  <li>
                    Copy the generated 16-character string (without spaces) and paste it into the password field above.
                  </li>
                </ol>
              </div>
            </div>

            {/* Right Column: Diagnostic Dispatch & Automated Triggers */}
            <div className="lg:col-span-5 space-y-4">
              {/* Diagnostic Connection & Test Email Card */}
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Send className="h-4 w-4 text-emerald-500" />
                    <span>Live SMTP Verification</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">Diagnostic Ping</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Verify end-to-end transport connectivity, TLS handshake negotiation, and authentication credentials with an authentic test receipt.
                </p>

                <div className="space-y-3">
                  <input
                    type="email"
                    data-testid="input-smtp-test-recipient"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="msanthosh9943@gmail.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <button
                    type="button"
                    data-testid="btn-test-smtp"
                    onClick={handleTestSmtp}
                    disabled={isTestingSmtp}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isTestingSmtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying Connection...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Diagnostic Test Email</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Automated Customer Triggers Card */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Automated Customer Triggers</span>
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                    <span className="font-semibold text-foreground block mb-0.5">Order Invoices &amp; Receipts</span>
                    <span className="text-[11px]">Dispatches itemized PDF invoices and thermal slip summaries upon POS counter checkout.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                    <span className="font-semibold text-foreground block mb-0.5">Workshop Pickup Notifications</span>
                    <span className="text-[11px]">Automated pickup readiness emails when lab technician marks eyeglasses as complete.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 5: Account & Security ── */}
        {activeTab === 'account' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column: Identity & Two-Factor Authentication */}
            <div className="lg:col-span-7 space-y-4">
              {/* User Profile & Linked Identity */}
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-500" />
                    <span>My Identity & Authentication Providers</span>
                  </h2>
                  <button
                    type="button"
                    onClick={loadAccountStatus}
                    disabled={loadingAccount}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <RotateCw className={`h-3.5 w-3.5 ${loadingAccount ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {loadingAccount && !accountStatus ? (
                  <div className="py-6 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</span>
                      <p className="text-sm font-semibold text-foreground">{accountStatus?.name || 'Administrator'}</p>
                      <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Role: {accountStatus?.role || 'user'}
                      </span>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered Email</span>
                      <p className="text-sm font-semibold text-foreground">{accountStatus?.email || 'admin@optixos.com'}</p>
                      <div className="flex items-center gap-2 pt-1">
                        {accountStatus?.hasGoogleLinked && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <Check className="h-3 w-3" />
                            <span>Google OAuth Linked</span>
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          accountStatus?.hasPassword
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {accountStatus?.hasPassword ? 'Password Configured' : 'Passwordless (Google Only)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication (2FA) */}
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Two-Step Verification (2FA / MFA)</span>
                  </h2>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    accountStatus?.twoFactorEnabled
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-muted text-muted-foreground border-border'
                  }`}>
                    {accountStatus?.twoFactorEnabled
                      ? `Active (${accountStatus.twoFactorMethod === 'otp' ? 'Email OTP' : 'Authenticator App'})`
                      : 'Disabled'}
                  </span>
                </div>

                {/* Two-Factor Flow Mode Routing */}
                {twoFactorMode === 'backup-codes' ? (
                  /* Stage 1: Backup Codes Display (Guaranteed persistent until user clicks Done) */
                  <div className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Save Your 10 Backup Recovery Codes</span>
                      </h3>
                      <button
                        type="button"
                        data-testid="done-backup-codes-btn"
                        onClick={() => {
                          setTwoFactorMode('idle');
                          setBackupCodesList([]);
                          loadAccountStatus();
                        }}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        I Have Saved My Codes (Done)
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      If you ever lose access to your authenticator app, each of these one-time codes can be used once to access your account. Store them safely in a password manager or secure location.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-background p-3 rounded-lg border border-border font-mono text-xs text-center font-bold text-foreground">
                      {backupCodesList.map((code, idx) => (
                        <div key={idx} className="bg-muted/40 py-1.5 rounded border border-border/50">
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        data-testid="download-backup-codes-btn"
                        onClick={handleDownloadBackupCodes}
                        className="flex items-center gap-1.5 rounded-lg bg-foreground text-background hover:opacity-90 px-3.5 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download Codes (.txt)</span>
                      </button>

                      <button
                        type="button"
                        data-testid="copy-backup-codes-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(backupCodesList.join('\n'));
                          toast.success('Backup codes copied to clipboard');
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted px-3.5 py-1.5 text-xs font-semibold text-foreground transition cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Codes</span>
                      </button>
                    </div>
                  </div>
                ) : twoFactorMode === 'totp-setup' ? (
                  /* Stage 2: TOTP Setup (QR code and 6-digit verification) */
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Smartphone className="h-4 w-4 text-blue-600" />
                        <span>Scan QR Code with Google Authenticator</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setTwoFactorMode('idle');
                          setTotpInputCode('');
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {totpQrDataUrl && (
                        <div className="rounded-xl bg-white p-2 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={totpQrDataUrl} alt="2FA QR Code" className="h-44 w-44" />
                        </div>
                      )}
                      <div className="space-y-3 flex-1">
                        <p className="text-xs text-muted-foreground">
                          1. Open your authenticator app and tap <strong>+ Add Account</strong>.<br />
                          2. Scan this QR code.<br />
                          3. Enter the 6-digit code shown in your app below and press <strong>Enter</strong>:
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            id="totp_pin_code"
                            name="totp_pin_code"
                            data-testid="totp-pin-input"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            autoFocus
                            autoComplete="off"
                            value={totpInputCode}
                            onChange={(e) => setTotpInputCode(e.target.value.replace(/\D/g, ''))}
                            onPaste={(e) => {
                              const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                              if (paste) {
                                e.preventDefault();
                                setTotpInputCode(paste);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                if (totpInputCode.length === 6 && !activatingTotp) {
                                  handleConfirmTotp();
                                }
                              }
                            }}
                            placeholder="000000"
                            className="w-36 text-center tracking-[4px] font-mono text-base py-1.5 rounded-lg border border-input bg-background font-bold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
                          />
                          <button
                            type="button"
                            data-testid="totp-confirm-btn"
                            onClick={() => handleConfirmTotp()}
                            disabled={activatingTotp || totpInputCode.length !== 6}
                            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            {activatingTotp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm & Enable'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : accountStatus?.twoFactorEnabled ? (
                  /* Stage 3: When 2FA is Active */
                  <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3 text-xs text-muted-foreground leading-relaxed">
                      <p className="font-semibold text-foreground mb-1">Your account is protected:</p>
                      Every sign-in requires an authentic 6-digit code via{' '}
                      <strong>{accountStatus.twoFactorMethod === 'otp' ? 'Email OTP' : 'Authenticator App (TOTP)'}</strong>.
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleDisable2fa}
                        disabled={disabling2fa}
                        className="rounded-lg border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 px-3 py-1.5 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        {disabling2fa ? 'Disabling...' : 'Disable Two-Factor Authentication'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Stage 4: When 2FA is Disabled (idle) */
                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Prevent unauthorized access to clinical data and financial invoicing by requiring a second authentication factor upon sign-in.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Option A: Authenticator App */}
                      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <h3 className="text-xs font-bold text-foreground">Authenticator App (TOTP)</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Generate dynamic codes with Google Authenticator, Authy, or Microsoft Authenticator.
                        </p>
                        <button
                          type="button"
                          onClick={handleStartTotpSetup}
                          disabled={activatingTotp || loadingAccount}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-1.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {activatingTotp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                          <span>Setup Authenticator App</span>
                        </button>
                      </div>

                      {/* Option B: Email OTP */}
                      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          <h3 className="text-xs font-bold text-foreground">Email OTP Codes</h3>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Receive single-use 6-digit verification codes sent directly to your registered email inbox.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleToggleEmailOtp(true)}
                          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground py-1.5 text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <span>Enable Email OTP</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Password Configuration & Danger Zone */}
            <div className="lg:col-span-5 space-y-4">
              {/* Password Configuration */}
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <h2 className="text-sm font-bold text-foreground border-b border-border pb-2 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-purple-500" />
                  <span>{accountStatus?.hasPassword ? 'Change Account Password' : 'Set Account Password (Enable Dual-Login)'}</span>
                </h2>

                {!accountStatus?.hasPassword ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-900/50 dark:bg-blue-950/30 p-3 text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground mb-1">Dual-Login Capability:</p>
                    You originally registered using Google OAuth without a password. By setting a password below, you will be able to log in to OptixOS using <strong>either Google OAuth OR Email & Password</strong> at your convenience.
                  </div>
                ) : null}

                <div className="space-y-3">
                  {accountStatus?.hasPassword && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</label>
                      <input
                        type="password"
                        value={accountCurrentPassword}
                        onChange={(e) => setAccountCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 font-mono"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {accountStatus?.hasPassword ? 'New Password' : 'Create Password'}
                    </label>
                    <input
                      type="password"
                      value={accountNewPassword}
                      onChange={(e) => setAccountNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</label>
                    <input
                      type="password"
                      value={accountConfirmPassword}
                      onChange={(e) => setAccountConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={accountStatus?.hasPassword ? handleChangePassword : handleSetPassword}
                    disabled={savingPassword || !accountNewPassword || accountNewPassword !== accountConfirmPassword}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Password...</span>
                      </>
                    ) : (
                      <>
                        <Key className="h-3.5 w-3.5" />
                        <span>{accountStatus?.hasPassword ? 'Update Password' : 'Set Account Password'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div className="rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/10 p-5 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Trash2 className="h-4 w-4" />
                  <h2 className="text-sm font-bold">Danger Zone</h2>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Deleting your account will immediately revoke all active POS terminal sessions and terminate your login identity. This action cannot be reversed.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full rounded-lg bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: System Engine & Cache Diagnostics ── */}
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-foreground">Diagnostic Engine &amp; Cache Architecture</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">Tier 2 + Tier 3</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  OptixOS uses a zero-latency stale-while-revalidate (SWR) cache engine combining local browser storage with distributed Upstash Redis. If you update product catalogs or encounter desynchronized state, purge all caches here.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    data-testid="btn-clear-application-cache"
                    onClick={handleClearAllCaches}
                    disabled={clearingCache}
                    className="inline-flex items-center gap-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 px-4 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${clearingCache ? 'animate-spin' : ''}`} />
                    <span>{clearingCache ? 'Purging All Application Caches...' : 'Purge All Client & Server Caches'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Cache Architecture Layers</span>
                </h3>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                    <div className="font-semibold text-foreground">Tier 1: Browser IndexedDB &amp; localStorage</div>
                    <p className="text-[11px]">Instantaneous 0ms hydration on first frame with background SWR sync.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                    <div className="font-semibold text-foreground">Tier 2: Upstash Distributed Redis</div>
                    <p className="text-[11px]">Server-side distributed cache with automatic cache tag invalidation on mutations.</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                    <div className="font-semibold text-foreground">Tier 3: Neon PostgreSQL Pooler</div>
                    <p className="text-[11px]">Transactional relational storage with tenant schema isolation.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Notifications & Communication Preferences ── */}
        {activeTab === 'notifications' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">
                  Practice Alerts &amp; Automated Triggers
                </h3>
                <p className="text-xs text-muted-foreground">
                  Control dispatch triggers for customer receipts, daily Z-report digests, and low frame/lens stock alerts.
                </p>
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Automatic Email Invoices</div>
                      <div className="text-[11px] text-muted-foreground">Email PDF tax invoice to customer upon checkout completion</div>
                    </div>
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <div>
                      <div className="text-xs font-semibold text-foreground">Low Stock Inventory Warnings</div>
                      <div className="text-[11px] text-muted-foreground">Alert optical clerks when frame or contact lens quantity drops below 5 units</div>
                    </div>
                    <Badge variant="outline" className="text-emerald-600 dark:text-emerald-400">Active (5 units)</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <div>
                      <div className="text-xs font-semibold text-foreground">End of Day Z-Report Summary</div>
                      <div className="text-[11px] text-muted-foreground">Send daily sales &amp; revenue audit to store owner at counter closing</div>
                    </div>
                    <Badge variant="outline" className="text-blue-600 dark:text-blue-400">Enabled</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </form>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl space-y-4 text-card-foreground">
            <div className="flex items-center gap-2.5 text-red-600">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-foreground">Confirm Account Deletion</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete your user profile and login credentials.
              {accountStatus?.hasPassword
                ? ' Please verify your identity by entering your current password below.'
                : ' Because you registered with Google OAuth, please type "DELETE MY ACCOUNT" below to confirm.'}
            </p>

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {accountStatus?.hasPassword ? (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Current Password</label>
                  <input
                    type="password"
                    required
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Confirmation Phrase</label>
                  <input
                    type="text"
                    required
                    value={deletePhrase}
                    onChange={(e) => setDeletePhrase(e.target.value)}
                    placeholder='Type "DELETE MY ACCOUNT"'
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-mono font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount || (accountStatus?.hasPassword ? !deletePassword : deletePhrase !== 'DELETE MY ACCOUNT')}
                  className="rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deletingAccount ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOTP Enable Password Verification Modal */}
      {showTotpPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-blue-500/30 bg-card p-6 shadow-2xl space-y-4 text-card-foreground">
            <div className="flex items-center gap-2.5 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-6 w-6" />
              <h3 className="text-base font-bold text-foreground">Verify Identity for 2FA</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Please enter your current account password to initiate Authenticator App (TOTP) two-step verification.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (totpSetupPassword.trim()) {
                  executeTotpSetup(totpSetupPassword.trim());
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Current Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={totpSetupPassword}
                  onChange={(e) => setTotpSetupPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTotpPasswordModal(false);
                    setTotpSetupPassword('');
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activatingTotp || !totpSetupPassword.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {activatingTotp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Verify & Set Up</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Disable 2FA Password Verification Modal */}
      {showDisable2faModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl space-y-4 text-card-foreground">
            <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-foreground">Disable Two-Factor Authentication</h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Disabling 2FA will lower your account security. Please verify your current password to continue.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (disable2faPassword.trim()) {
                  executeDisable2fa(disable2faPassword.trim());
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-muted-foreground">Current Password</label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={disable2faPassword}
                  onChange={(e) => setDisable2faPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisable2faModal(false);
                    setDisable2faPassword('');
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling2fa || !disable2faPassword.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {disabling2fa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Confirm Disable</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Unsaved Changes Navigation Guard Dialog ── */}
      <Dialog
        isOpen={showUnsavedModal}
        onClose={() => setShowUnsavedModal(false)}
        title="Unsaved Changes"
        description={`You have unsaved changes in ${activeTab === 'general' ? 'General Profile' : 'Email & SMTP'}. Do you want to save or discard your changes before leaving?`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnsavedModal(false)}
            >
              Keep Editing
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDiscard}
            >
              Discard Changes
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isPending}
              loadingText="Saving..."
              onClick={handleSaveAndSwitch}
            >
              Save & Continue
            </Button>
          </div>
        }
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          Switching tabs without saving will discard any edits you have entered. To preserve your updates, choose &ldquo;Save &amp; Continue&rdquo;.
        </p>
      </Dialog>
    </div>
  );
}
