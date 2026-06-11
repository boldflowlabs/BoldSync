import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminOrgN8nPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: n8nServices } = await adminClient
    .from('n8n_services')
    .select('*')
    .eq('org_id', id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>n8n Services</CardTitle>
        </CardHeader>
        <CardContent>
          {!n8nServices || n8nServices.length === 0 ? (
            <div className="h-24 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
              No AI Services configured.
            </div>
          ) : (
            <div className="space-y-4">
              {n8nServices.map((service: any) => (
                <div key={service.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold capitalize">{service.service_type}</h3>
                    <span className={`text-xs px-2 py-1 rounded-md ${service.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {service.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Webhook URL:</span> {service.webhook_url || 'Not set'}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Messages Handled (7d):</span> {service.messages_handled_7d || 0}
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Fallback Rate:</span> {service.fallback_rate || 0}%
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
