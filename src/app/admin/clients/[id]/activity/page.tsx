import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function AdminOrgActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: recentActivity } = await adminClient
    .from('admin_activity_logs')
    .select('id, event_type, created_at, actor_id, metadata')
    .eq('org_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-start space-x-4 border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="bg-primary/10 p-2 rounded-full mt-1">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {log.event_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {JSON.stringify(log.metadata)}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground">
              No activity recorded for this organization yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
