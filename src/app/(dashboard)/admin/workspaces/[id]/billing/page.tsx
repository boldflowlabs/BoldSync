import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AdminCheckout } from '@/components/admin/admin-checkout';
import { notFound } from 'next/navigation';

export default async function AdminBillingPage({ params }: { params: { id: string } }) {
  const adminClient = createAdminClient();

  const { data: org } = await adminClient
    .from('organizations')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!org) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing Management</h1>
        <p className="text-muted-foreground">Manage subscription and billing for {org.name}.</p>
      </div>

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
          <CardContent>
            <div className="text-2xl font-bold capitalize">{org.status || 'ACTIVE'}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <AdminCheckout orgId={org.id} />
      </div>
    </div>
  );
}
