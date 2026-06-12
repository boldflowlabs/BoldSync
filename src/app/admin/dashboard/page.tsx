import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Activity, MessageSquare, CreditCard, AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default async function AdminDashboardPage() {
  const adminClient = createAdminClient();

  const { count: totalClients } = await adminClient
    .from('organizations')
    .select('*', { count: 'exact', head: true });

  const { data: suspendedClientsData } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('status', 'suspended');
    
  const suspendedClients = suspendedClientsData?.length || 0;

  const { count: totalWabas } = await adminClient
    .from('waba_accounts')
    .select('*', { count: 'exact', head: true });

  const { data: disconnectedWabas } = await adminClient
    .from('waba_accounts')
    .select('id, waba_id, org_id, organizations(name)')
    .eq('status', 'disconnected');

  // Trial expiring within 3 days
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  
  const { data: expiringTrials } = await adminClient
    .from('organizations')
    .select('id, name, trial_ends_at')
    .eq('status', 'trial')
    .lte('trial_ends_at', threeDaysFromNow.toISOString())
    .gte('trial_ends_at', new Date().toISOString());

  // Recent Activity
  const { data: recentActivity } = await adminClient
    .from('admin_activity_logs')
    .select('id, event_type, created_at, org_id, organizations(name), actor_id')
    .order('created_at', { ascending: false })
    .limit(10);

  // Collect active alerts
  const alerts: { id: string; title: string; description: string; type: 'critical' | 'warning' | 'info' }[] = [];
  
  if (suspendedClientsData && suspendedClientsData.length > 0) {
    suspendedClientsData.forEach(org => {
      alerts.push({
        id: `susp-${org.id}`,
        title: `Organization Suspended`,
        description: `${org.name} has been suspended.`,
        type: 'critical'
      });
    });
  }

  if (disconnectedWabas && disconnectedWabas.length > 0) {
    disconnectedWabas.forEach(waba => {
      alerts.push({
        id: `waba-${waba.id}`,
        title: `Disconnected WABA`,
        description: `${(waba.organizations as any)?.name || (waba.organizations as any)?.[0]?.name || 'Unknown Org'} has a disconnected WABA.`,
        type: 'warning'
      });
    });
  }

  if (expiringTrials && expiringTrials.length > 0) {
    expiringTrials.forEach(org => {
      alerts.push({
        id: `trial-${org.id}`,
        title: `Trial Expiring Soon`,
        description: `${org.name}'s trial ends in ${formatDistanceToNow(new Date(org.trial_ends_at))}.`,
        type: 'info'
      });
    });
  }

  // Calculate MRR
  const { data: activeOrgsWithPlans } = await adminClient
    .from('organizations')
    .select('plan, status')
    .eq('status', 'active');

  const { data: plansData } = await adminClient
    .from('plans')
    .select('id, monthly_price');

  let mrr = 0;
  if (activeOrgsWithPlans && plansData) {
    const priceMap = plansData.reduce((acc, plan) => {
      acc[plan.id] = plan.monthly_price;
      return acc;
    }, {} as Record<string, number>);

    mrr = activeOrgsWithPlans.reduce((sum, org) => {
      return sum + (priceMap[org.plan] || 0);
    }, 0);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform health and overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Suspended</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspendedClients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WABA Connections</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWabas || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform MRR</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly Recurring Revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Global Activity</CardTitle>
            <CardDescription>Recent actions across the platform.</CardDescription>
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
                      <p className="text-sm text-muted-foreground">
                        {(log.organizations as any)?.name || (log.organizations as any)?.[0]?.name || 'System'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                No recent activity.
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Actionable notifications requiring attention.</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-4 border border-border p-3 rounded-lg">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.type === 'critical' ? 'text-destructive' : alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                No active alerts.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
