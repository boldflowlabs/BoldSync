import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

export default async function AdminOrgOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: org } = await adminClient
    .from('organizations')
    .select(`
      *,
      owner:org_members(user:profiles(full_name, email))
    `)
    .eq('id', id)
    .single();

  if (!org) {
    notFound();
  }

  // Find owner details from the join
  const ownerMember = org.owner?.find((m: any) => m.user);
  const owner = ownerMember?.user;

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organization Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-mono text-xs">{org.id}</span>
            
            <span className="text-muted-foreground">Industry:</span>
            <span className="capitalize">{org.industry || 'Unknown'}</span>
            
            <span className="text-muted-foreground">Company Size:</span>
            <span>{org.company_size || 'Unknown'}</span>

            <span className="text-muted-foreground">Created:</span>
            <span>{org.created_at ? format(new Date(org.created_at), 'PPP') : 'Unknown'}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Owner Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span className="text-muted-foreground">Name:</span>
            <span>{owner?.full_name || 'N/A'}</span>
            
            <span className="text-muted-foreground">Email:</span>
            <span>{owner?.email || 'N/A'}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* 
        The quick action buttons (Change Plan, Suspend, Impersonate) 
        are handled by the specific tabs (Billing) or the Layout header.
      */}
    </div>
  );
}
