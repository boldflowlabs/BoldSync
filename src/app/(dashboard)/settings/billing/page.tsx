import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CreditCard, Receipt, Zap } from 'lucide-react';
import Link from 'next/link';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const orgId = user?.user_metadata?.org_id || user?.app_metadata?.org_id;

  if (!orgId) {
    return <div>Organization not found.</div>;
  }

  // Fetch org and plan
  const { data: org } = await supabase
    .from('organizations')
    .select('plan, status, next_billing_at')
    .eq('id', orgId)
    .single();

  const currentPlan = org?.plan || 'starter';

  // Fetch plan limits
  const { data: planData } = await supabase
    .from('plans')
    .select('*')
    .eq('id', currentPlan)
    .single();

  // Fetch current month usage
  const { data: usageData } = await supabase
    .from('usage_metrics')
    .select('messages_sent, ai_queries')
    .eq('org_id', orgId)
    // simple matching for the demo
    .order('date', { ascending: false })
    .limit(30);

  const totalMessages = usageData?.reduce((sum, row) => sum + (row.messages_sent || 0), 0) || 0;
  const totalAiQueries = usageData?.reduce((sum, row) => sum + (row.ai_queries || 0), 0) || 0;

  const msgLimit = planData?.message_limit || 1000;
  const aiLimit = planData?.ai_query_limit || 100;
  
  const msgPercent = Math.min(100, Math.round((totalMessages / msgLimit) * 100));
  const aiPercent = Math.min(100, Math.round((totalAiQueries / aiLimit) * 100));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/settings" />}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Usage</h1>
          <p className="text-muted-foreground">Manage your subscription plan and view usage.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Current Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold capitalize">{currentPlan} Plan</p>
                <p className="text-sm text-muted-foreground">Status: <Badge variant={org?.status === 'active' ? 'default' : 'secondary'}>{org?.status || 'Active'}</Badge></p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">${planData?.monthly_price || 0}</p>
                <p className="text-sm text-muted-foreground">/ month</p>
              </div>
            </div>
            {org?.next_billing_at && (
              <p className="text-sm">Next billing date: {new Date(org.next_billing_at).toLocaleDateString()}</p>
            )}
            <div className="pt-4 flex gap-3">
              <Button className="w-full">Upgrade Plan</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Monthly Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Messages Sent</span>
                <span className="text-muted-foreground">{totalMessages} / {msgLimit}</span>
              </div>
              <Progress value={msgPercent} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">AI Queries</span>
                <span className="text-muted-foreground">{totalAiQueries} / {aiLimit}</span>
              </div>
              <Progress value={aiPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Invoices & Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Invoice history will appear here once your first payment is processed.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
