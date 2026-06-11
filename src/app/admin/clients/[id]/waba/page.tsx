import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function AdminWabaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: org } = await adminClient
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (!org) {
    notFound();
  }

  const { data: wabaAccount } = await adminClient
    .from('waba_accounts')
    .select('*')
    .eq('org_id', id)
    .single();

  async function revokeAccess() {
    'use server';
    const adminClient = createAdminClient();
    await adminClient.from('waba_accounts').delete().eq('org_id', id);
    revalidatePath(`/admin/clients/${id}/waba`);
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {!wabaAccount ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No WABA Account Connected</h2>
            <p className="text-muted-foreground max-w-md">
              This organization has not connected a WhatsApp Business API account yet. They need to do this from their client dashboard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Connection Status</CardTitle>
              <div className="flex items-center text-green-500">
                <CheckCircle2 className="w-5 h-5 mr-2" />
                <span className="font-semibold">Configured</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground">Phone Number ID</label>
                  <p className="font-mono text-sm">{wabaAccount.phone_number_id}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">WABA ID</label>
                  <p className="font-mono text-sm">{wabaAccount.waba_id}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Verify Token</label>
                  <p className="font-mono text-sm">{wabaAccount.verify_token}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Connected At</label>
                  <p className="text-sm">{new Date(wabaAccount.created_at).toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle className="text-red-500">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Revoking access will delete the access token and immediately break all WhatsApp communication for this organization.
              </p>
              <form action={revokeAccess}>
                <Button variant="destructive" type="submit">
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Revoke WABA Access
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
