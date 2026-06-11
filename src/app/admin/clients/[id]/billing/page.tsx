import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AdminCheckout } from '@/components/admin/admin-checkout';
import { notFound } from 'next/navigation';
import { updateOrgStatus, updateOrgPlan } from './actions';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function AdminBillingPage({ params }: { params: Promise<{ id: string }> }) {
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

  return (
    <div className="space-y-6 max-w-4xl">

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold uppercase">{org.plan || 'NONE'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Account Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold capitalize">{org.status || 'ACTIVE'}</div>
            <div className="flex flex-wrap gap-2">
              <form action={async () => { 'use server'; await updateOrgStatus(org.id, 'active'); }}>
                <Button variant="outline" size="sm" type="submit">Set Active</Button>
              </form>
              <form action={async () => { 'use server'; await updateOrgStatus(org.id, 'trial'); }}>
                <Button variant="outline" size="sm" type="submit">Set Trial</Button>
              </form>
              <form action={async () => { 'use server'; await updateOrgStatus(org.id, 'suspended'); }}>
                <Button variant="destructive" size="sm" type="submit">Suspend Account</Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manual Plan Override</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <form action={async () => { 'use server'; await updateOrgPlan(org.id, 'starter'); }}>
            <Button variant="outline" type="submit">Starter</Button>
          </form>
          <form action={async () => { 'use server'; await updateOrgPlan(org.id, 'growth'); }}>
            <Button variant="outline" type="submit">Growth</Button>
          </form>
          <form action={async () => { 'use server'; await updateOrgPlan(org.id, 'scale'); }}>
            <Button variant="outline" type="submit">Scale</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-8">
        <AdminCheckout orgId={org.id} />
      </div>
    </div>
  );
}
