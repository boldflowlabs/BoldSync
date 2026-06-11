import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default async function AdminGlobalN8nPage() {
  const adminClient = createAdminClient();

  // Fetch all n8n services across all orgs
  const { data: services } = await adminClient
    .from('n8n_services')
    .select(`
      *,
      organization:organizations(name)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Global n8n Services</h1>
        <p className="text-muted-foreground">Control panel for every n8n-powered webhook and AI service across the platform.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Webhook Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Webhook URL</TableHead>
                <TableHead>Messages (7d)</TableHead>
                <TableHead>Fallback Rate</TableHead>
                <TableHead>Last Called</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services?.map((service: any) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/clients/${service.org_id}/n8n`} className="hover:underline">
                      {service.organization?.name || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{service.service_type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={service.enabled ? 'default' : 'secondary'} className={service.enabled ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                      {service.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" title={service.webhook_url}>
                    {service.webhook_url || 'Not Set'}
                  </TableCell>
                  <TableCell>{service.messages_handled_7d || 0}</TableCell>
                  <TableCell>{service.fallback_rate || 0}%</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {service.last_called_at ? formatDistanceToNow(new Date(service.last_called_at), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" render={<Link href={`/admin/clients/${service.org_id}/n8n`} />}>
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {(!services || services.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No n8n services configured yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Global Webhook Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Internal Webhook Secret:</span>
              <span className="font-mono truncate text-xs" title={process.env.INTERNAL_WEBHOOK_SECRET || ''}>
                {process.env.INTERNAL_WEBHOOK_SECRET ? '••••••••' : 'Not configured (.env)'}
              </span>
              
              <span className="text-muted-foreground">Default AI Webhook:</span>
              <span className="font-mono truncate text-xs" title={process.env.N8N_AI_WEBHOOK_URL || ''}>
                {process.env.N8N_AI_WEBHOOK_URL || 'Not configured (.env)'}
              </span>

              <span className="text-muted-foreground">Welcome Email Webhook:</span>
              <span className="font-mono truncate text-xs" title={process.env.N8N_WELCOME_WEBHOOK_URL || ''}>
                {process.env.N8N_WELCOME_WEBHOOK_URL || 'Not configured (.env)'}
              </span>
            </div>
            <div className="pt-4 flex justify-end">
              <Button variant="outline" size="sm" render={<Link href="/admin/settings" />}>
                Edit Env Vars
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
