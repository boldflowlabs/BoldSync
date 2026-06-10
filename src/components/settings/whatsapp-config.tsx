'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Zap,
  AlertTriangle,
  RotateCcw,
  Shield,
  Smartphone,
  MessageSquare,
  Globe
} from 'lucide-react';

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

const MASKED_TOKEN = '••••••••••••••••';

type ConnectionStatus = 'connected' | 'disconnected' | 'unknown';
type ResetReason = 'token_corrupted' | 'meta_api_error' | null;

export function WhatsAppConfig() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [config, setConfig] = useState<any | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [resetReason, setResetReason] = useState<ResetReason>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [tokenEdited, setTokenEdited] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');

  // For Meta Embedded Signup loading state
  const [connectingMeta, setConnectingMeta] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      // First verify health via the API (decrypts token + pings Meta)
      // This endpoint now reads the current org's waba_accounts row automatically.
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.verify_token) {
        setVerifyToken(payload.verify_token);
        setWebhookUrl(typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook` : '');
      }

      if (res.ok && payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        // To populate the manual entry form with DB values, we can fetch from DB:
        const { data } = await supabase.from('waba_accounts').select('*').maybeSingle();
        if (data) {
          setConfig(data);
          setPhoneNumberId(data.phone_number_id || '');
          setWabaId(data.waba_id || '');
          setAccessToken(MASKED_TOKEN);
          setTokenEdited(false);
        }
      } else {
        setConnectionStatus('disconnected');
        setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
        setStatusMessage(payload.message || '');
      }
    } catch (err) {
      console.error('fetchConfig error:', err);
      toast.error('Failed to load WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetchConfig();
  }, [authLoading, user, fetchConfig]);

  async function handleSave() {
    if (!phoneNumberId.trim() || !wabaId.trim()) {
      toast.error('Phone Number ID and WABA ID are required');
      return;
    }
    if (!config && (!accessToken.trim() || !tokenEdited)) {
      toast.error('Access Token is required for initial setup');
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, unknown> = {
        phone_number_id: phoneNumberId.trim(),
        waba_id: wabaId.trim(),
        verify_token: verifyToken.trim(),
      };

      if (tokenEdited && accessToken !== MASKED_TOKEN && accessToken.trim()) {
        payload.access_token = accessToken.trim();
      } else if (config) {
        toast.error('Please re-enter the Access Token to save changes');
        setSaving(false);
        return;
      }

      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to save configuration');
        setSaving(false);
        return;
      }

      toast.success(
        data.phone_info?.verified_name
          ? `Connected to ${data.phone_info.verified_name}`
          : 'Configuration saved successfully'
      );

      await fetchConfig();
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    try {
      setTesting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'GET' });
      const payload = await res.json();

      if (payload.connected) {
        setConnectionStatus('connected');
        setResetReason(null);
        setStatusMessage('');
        toast.success(
          payload.phone_info?.verified_name
            ? `Connected to ${payload.phone_info.verified_name}`
            : 'API connection successful'
        );
      } else {
        setConnectionStatus('disconnected');
        setResetReason(payload.needs_reset ? 'token_corrupted' : payload.reason === 'meta_api_error' ? 'meta_api_error' : null);
        setStatusMessage(payload.message || '');
        toast.error(payload.message || 'API connection failed');
      }
    } catch (err) {
      console.error('Test connection error:', err);
      setConnectionStatus('disconnected');
      toast.error('Connection test failed. Check network and try again.');
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (!confirm('This will disconnect your Meta account. Continue?')) {
      return;
    }

    try {
      setResetting(true);
      const res = await fetch('/api/whatsapp/config', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to reset configuration');
        return;
      }

      toast.success('Configuration cleared. You can now reconnect.');
      setConfig(null);
      setPhoneNumberId('');
      setWabaId('');
      setAccessToken('');
      setVerifyToken('');
      setTokenEdited(false);
      setConnectionStatus('disconnected');
      setResetReason(null);
      setStatusMessage('');
    } catch (err) {
      console.error('Reset error:', err);
      toast.error('Failed to reset configuration');
    } finally {
      setResetting(false);
    }
  }

  // --- Meta Embedded Signup Logic ---
  const handleMetaConnect = async () => {
    setConnectingMeta(true);
    // In a real application, we would initialize FB.login here.
    // For now, we simulate the flow and direct them to the fallback.
    setTimeout(() => {
      toast.error('Meta Embedded Signup is not fully configured (Missing App ID). Please use Manual Configuration below for development.', { duration: 5000 });
      setConnectingMeta(false);
    }, 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const showResetBanner = resetReason === 'token_corrupted';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px] mt-4">
      {/* Main UI */}
      <div className="space-y-6">
        {showResetBanner && (
          <Alert className="bg-amber-950/40 border-amber-600/40">
            <div className="flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <AlertTitle className="text-amber-200 mb-1">
                  Stored token can't be decrypted
                </AlertTitle>
                <AlertDescription className="text-amber-100/80 text-sm">
                  {statusMessage}
                </AlertDescription>
                <Button
                  onClick={handleReset}
                  disabled={resetting}
                  size="sm"
                  className="mt-3 bg-amber-600 hover:bg-amber-700 text-foreground"
                >
                  {resetting ? <Loader2 className="size-4 animate-spin mr-2" /> : <RotateCcw className="size-4 mr-2" />}
                  Reset Configuration
                </Button>
              </div>
            </div>
          </Alert>
        )}

        <Alert className="bg-background border-border shadow-sm">
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <CheckCircle2 className="size-5 text-green-500" />
            ) : (
              <AlertTriangle className="size-5 text-amber-500" />
            )}
            <AlertTitle className="text-foreground mb-0 text-base font-semibold">
              {connectionStatus === 'connected' ? 'WhatsApp is Connected' : 'Not Connected'}
            </AlertTitle>
          </div>
          <AlertDescription className="text-muted-foreground mt-1">
            {connectionStatus === 'connected'
              ? 'Your organization is connected to the WhatsApp Business API. You can send and receive messages.'
              : statusMessage || 'Connect your Meta account to start using WhatsApp on BoldSync.'}
          </AlertDescription>
        </Alert>

        {connectionStatus !== 'connected' && (
          <Card className="bg-gradient-to-br from-[#1c1f2e] to-[#161824] border-border overflow-hidden">
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-center space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <MessageSquare className="size-8 text-primary" />
                </div>
                <div className="flex space-x-1">
                  <div className="size-2 rounded-full bg-border animate-pulse" />
                  <div className="size-2 rounded-full bg-border animate-pulse delay-75" />
                  <div className="size-2 rounded-full bg-border animate-pulse delay-150" />
                </div>
                <div className="size-16 rounded-2xl bg-[#1877F2]/20 flex items-center justify-center">
                  <FacebookIcon className="size-8 text-[#1877F2]" />
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <h3 className="text-2xl font-bold text-foreground">Connect Meta Account</h3>
                <p className="text-sm text-muted-foreground">
                  Link your WhatsApp Business Account directly. No coding required. We will securely manage your keys and webhooks.
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleMetaConnect}
                disabled={connectingMeta}
                className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-medium px-8 h-12 shadow-lg shadow-[#1877F2]/20 transition-all hover:scale-105"
              >
                {connectingMeta ? <Loader2 className="size-5 animate-spin mr-2" /> : <FacebookIcon className="size-5 mr-2" />}
                Connect with Facebook
              </Button>
              <div className="flex items-center justify-center space-x-6 text-xs text-muted-foreground pt-4">
                <div className="flex items-center"><Shield className="size-3.5 mr-1.5" /> Secure Setup</div>
                <div className="flex items-center"><Smartphone className="size-3.5 mr-1.5" /> Official API</div>
              </div>
            </CardContent>
          </Card>
        )}

        <Accordion className="w-full">
          <AccordionItem value="manual" className="border-border bg-card rounded-lg px-4 shadow-sm">
            <AccordionTrigger className="text-foreground hover:no-underline py-4">
              <span className="font-medium">Manual Configuration (Advanced)</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="text-sm font-semibold mb-3 flex items-center text-foreground">
                  <Globe className="size-4 mr-2 text-primary" />
                  Webhook Setup Details
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Copy these details to the Meta App Dashboard under WhatsApp &gt; Configuration.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Callback URL</Label>
                    <div className="flex">
                      <Input readOnly value={webhookUrl} className="bg-background h-8 text-xs font-mono" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Verify Token</Label>
                    <div className="flex">
                      <Input 
                        value={verifyToken} 
                        onChange={(e) => setVerifyToken(e.target.value)}
                        placeholder="e.g. my_custom_token"
                        className="bg-background h-8 text-xs font-mono" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Number ID</Label>
                <Input
                  placeholder="e.g. 100234567890123"
                  value={phoneNumberId}
                  onChange={(e) => setPhoneNumberId(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp Business Account ID</Label>
                <Input
                  placeholder="e.g. 100234567890456"
                  value={wabaId}
                  onChange={(e) => setWabaId(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label>Permanent Access Token</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Enter your access token"
                    value={accessToken}
                    onChange={(e) => {
                      setAccessToken(e.target.value);
                      setTokenEdited(true);
                    }}
                    onFocus={() => {
                      if (accessToken === MASKED_TOKEN) {
                        setAccessToken('');
                        setTokenEdited(true);
                      }
                    }}
                    className="bg-muted border-border pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : 'Save Manual Config'}
                </Button>
                {config && (
                  <Button variant="destructive" onClick={handleReset} disabled={resetting}>
                    Disconnect
                  </Button>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      </div>

      {/* Sidebar */}
      <div>
        <Card className="bg-background border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Connection Health</CardTitle>
            <CardDescription>Status of your WhatsApp API connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">API Status</span>
              {connectionStatus === 'connected' ? (
                <span className="flex items-center text-green-500 font-medium">
                  <span className="size-2 rounded-full bg-green-500 mr-2 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="flex items-center text-amber-500 font-medium">
                  <span className="size-2 rounded-full bg-amber-500 mr-2" />
                  Offline
                </span>
              )}
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Webhooks</span>
              {connectionStatus === 'connected' ? (
                <span className="text-green-500 font-medium">Active</span>
              ) : (
                <span className="text-muted-foreground">Pending</span>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testing || !config}
              className="w-full mt-4"
            >
              {testing ? <Loader2 className="size-4 animate-spin mr-2" /> : <Zap className="size-4 mr-2" />}
              Test Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
