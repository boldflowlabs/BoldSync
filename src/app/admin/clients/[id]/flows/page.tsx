import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Network } from 'lucide-react';
import { format } from 'date-fns';

export default async function AdminOrgFlowsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  // Assuming `flows` table has name, status, and created_at
  const { data: flows } = await adminClient
    .from('flows')
    .select('id, name, status, created_at')
    .eq('org_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Configured Flows</CardTitle>
        </CardHeader>
        <CardContent>
          {flows && flows.length > 0 ? (
            <div className="space-y-4">
              {flows.map((flow) => (
                <div key={flow.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      <Network className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">
                        {flow.name || 'Unnamed Flow'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {format(new Date(flow.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-medium capitalize border px-2 py-1 rounded-md">
                    {flow.status || 'draft'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col gap-2 items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
              <Network className="h-8 w-8 text-muted-foreground/50" />
              <p>No flows configured for this organization.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
