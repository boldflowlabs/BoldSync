import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User } from 'lucide-react';
import { ClientTabs } from './client-tabs';

export default async function ClientDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminClient = createAdminClient();

  // Fetch the org details to display in the header
  const { data: org } = await adminClient
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (!org) {
    notFound();
  }

  return (
    <div className="space-y-8">
      {/* Header Area */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={<Link href="/admin/clients" />}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{org.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-muted px-2 py-1 rounded-md capitalize font-medium">{org.plan || 'No Plan'}</span>
              <span className="text-xs bg-muted px-2 py-1 rounded-md capitalize text-muted-foreground">{org.status || 'Active'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Top Level Impersonate Action */}
          <form action={`/admin/clients/${org.id}/impersonate/route`} method="POST">
            <Button variant="outline" type="submit" className="gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              <span>Impersonate Owner</span>
            </Button>
          </form>
        </div>
      </div>

      {/* Tabs Navigation */}
      <ClientTabs orgId={org.id} />

      {/* Tab Content Area */}
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
