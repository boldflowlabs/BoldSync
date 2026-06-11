import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default async function AdminGlobalWabaPage() {
  const adminClient = createAdminClient();

  // Fetch all WABA accounts with their associated organization
  const { data: accounts } = await adminClient
    .from('waba_accounts')
    .select(`
      *,
      organization:organizations(name)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Global WABA Management</h1>
        <p className="text-muted-foreground">Overview of every connected WhatsApp Business Account across all clients.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Phone Number ID</TableHead>
                <TableHead>WABA ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Last Webhook</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map((account: any) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/clients/${account.org_id}/waba`} className="hover:underline">
                      {account.organization?.name || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{account.phone_number_id}</TableCell>
                  <TableCell className="font-mono text-xs">{account.waba_id}</TableCell>
                  <TableCell>
                    <Badge variant={account.status === 'disconnected' ? 'destructive' : 'default'} className={account.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}>
                      {account.status || 'connected'}
                    </Badge>
                  </TableCell>
                  <TableCell>{account.message_tier || '1K/day'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {account.last_webhook_at ? formatDistanceToNow(new Date(account.last_webhook_at), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" render={<Link href={`/admin/clients/${account.org_id}/waba`} />}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {(!accounts || accounts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No WABA accounts connected yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
