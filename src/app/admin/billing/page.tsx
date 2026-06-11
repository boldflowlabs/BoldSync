import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { format, isPast, isFuture } from 'date-fns';

export default async function AdminGlobalBillingPage() {
  const adminClient = createAdminClient();

  // Fetch all subscriptions across all clients
  const { data: subscriptions } = await adminClient
    .from('subscriptions')
    .select(`
      *,
      organization:organizations(name)
    `)
    .order('created_at', { ascending: false });

  // Calculate MRR
  const mrr = subscriptions?.reduce((total, sub) => {
    if (sub.status === 'active') return total + (sub.amount || 0);
    return total;
  }, 0) || 0;

  const activeCount = subscriptions?.filter(s => s.status === 'active').length || 0;
  const haltedCount = subscriptions?.filter(s => s.status === 'halted' || s.status === 'failed').length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Global Billing</h1>
        <p className="text-muted-foreground">Financial visibility and subscription management across all clients.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Failed / Halted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{haltedCount}</div>
            <p className="text-xs text-muted-foreground">Requires immediate action</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Razorpay ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions?.map((sub: any) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/clients/${sub.org_id}/billing`} className="hover:underline">
                      {sub.organization?.name || 'Unknown'}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{sub.plan || 'Custom'}</TableCell>
                  <TableCell>₹{sub.amount?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={sub.status === 'halted' || sub.status === 'failed' ? 'destructive' : 'default'} 
                      className={sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : ''}
                    >
                      {sub.status || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className={sub.next_billing_at && isPast(new Date(sub.next_billing_at)) ? 'text-destructive font-medium' : ''}>
                    {sub.next_billing_at ? format(new Date(sub.next_billing_at), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{sub.razorpay_subscription_id || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" render={<Link href={`/admin/clients/${sub.org_id}/billing`} />}>
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {(!subscriptions || subscriptions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No active subscriptions found.
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
