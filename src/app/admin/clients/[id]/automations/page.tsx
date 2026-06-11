import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminOrgAutomationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: automations } = await adminClient
    .from('automations')
    .select('*')
    .eq('org_id', id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Automations</CardTitle>
        </CardHeader>
        <CardContent>
          {automations?.length === 0 ? (
            <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
              No automations created yet.
            </div>
          ) : (
            <div className="space-y-4">
              {automations?.map((auto: any) => (
                <div key={auto.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{auto.name}</h3>
                    <p className="text-sm text-muted-foreground">Status: {auto.is_active ? 'Active' : 'Paused'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
