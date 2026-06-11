import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

export default async function AdminGlobalLogsPage() {
  const adminClient = createAdminClient();

  // Fetch the latest 50 webhook logs
  const { data: webhookLogs } = await adminClient
    .from('webhook_logs')
    .select('*, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  // Fetch the latest 50 automation logs
  const { data: automationLogs } = await adminClient
    .from('automation_logs')
    .select('*, organization:organizations(name), automation:automations(name)')
    .order('executed_at', { ascending: false })
    .limit(50);

  // Fetch the latest 50 n8n call logs
  const { data: n8nLogs } = await adminClient
    .from('n8n_call_logs')
    .select('*, organization:organizations(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Logs</h1>
        <p className="text-muted-foreground">Platform-wide visibility into webhooks, automations, and n8n calls.</p>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="webhooks">Meta Webhooks</TabsTrigger>
          <TabsTrigger value="automations">Automations</TabsTrigger>
          <TabsTrigger value="n8n">n8n Calls</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Inbound Meta Webhooks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>WABA ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {webhookLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">{log.organization?.name || 'Unknown'}</TableCell>
                      <TableCell className="font-mono text-xs">{log.waba_id}</TableCell>
                      <TableCell className="capitalize">{log.message_type}</TableCell>
                      <TableCell>{log.payload_size} B</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'error' ? 'destructive' : log.status === 'ignored' ? 'secondary' : 'default'} className={log.status === 'processed' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!webhookLogs || webhookLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No webhook logs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations">
          <Card>
            <CardHeader>
              <CardTitle>Automation Executions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Automation</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {log.executed_at ? format(new Date(log.executed_at), 'MMM d, HH:mm:ss') : 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">{log.organization?.name || 'Unknown'}</TableCell>
                      <TableCell>{log.automation?.name || 'Unknown'}</TableCell>
                      <TableCell className="capitalize">{log.trigger_type}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'failed' ? 'destructive' : log.status === 'skipped' ? 'secondary' : 'default'} className={log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                          {log.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!automationLogs || automationLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No automation logs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="n8n">
          <Card>
            <CardHeader>
              <CardTitle>Outbound n8n Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status Code</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {n8nLogs?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                        {log.created_at ? format(new Date(log.created_at), 'MMM d, HH:mm:ss') : 'Unknown'}
                      </TableCell>
                      <TableCell className="font-medium">{log.organization?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={log.response_status >= 400 ? 'destructive' : 'default'} className={log.response_status >= 200 && log.response_status < 300 ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                          {log.response_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.response_time_ms} ms</TableCell>
                      <TableCell className="text-destructive max-w-[200px] truncate" title={log.error_message || ''}>
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!n8nLogs || n8nLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No n8n call logs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
