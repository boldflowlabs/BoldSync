"use client";

import { useState } from 'react';
import { useOrg } from '@/components/org-provider';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, CreditCard, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import Script from 'next/script';

const PLANS = [
  { 
    id: 'starter', 
    name: 'Starter', 
    price: '₹4,999',
    period: 'per month',
    included: ['AI chatbot flow', 'WhatsApp messaging', '500 conversations/mo', 'Basic CRM'],
    excluded: ['Broadcasts', 'Campaigns', 'Priority support']
  },
  { 
    id: 'growth', 
    name: 'Growth', 
    price: '₹9,999',
    period: 'per month',
    badge: 'Most popular',
    included: ['AI chatbot flow', 'WhatsApp messaging', '2,000 conversations/mo', 'Full CRM', 'Broadcasts + campaigns', 'Priority support'],
    excluded: ['Custom AI training']
  },
  { 
    id: 'scale', 
    name: 'Scale', 
    price: '₹19,999',
    period: 'per month',
    included: ['AI chatbot flow', 'WhatsApp messaging', 'Unlimited conversations', 'Full CRM', 'Broadcasts + campaigns', 'Dedicated support', 'Custom AI training'],
    excluded: []
  }
];

export function BillingPanel() {
  const { orgs, activeOrganizationId, refreshOrgs } = useOrg();
  const [loading, setLoading] = useState<string | null>(null);

  const activeWorkspace = orgs.find(w => w.id === activeOrganizationId);
  const currentPlan = activeWorkspace?.plan || 'starter';

  const handleUpgrade = async (planId: string) => {
    try {
      setLoading(planId);
      const res = await fetch('/api/razorpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, workspaceId: activeOrganizationId })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to initialize checkout');

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "BoldSync",
        description: `Upgrade to ${planId.toUpperCase()} Plan`,
        handler: async function (response: any) {
          toast.success("Payment successful! Your plan will be upgraded shortly.");
          setTimeout(refreshOrgs, 3000); // Wait for webhook
        },
        theme: {
          color: "#4f46e5", // primary color
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="space-y-6 max-w-5xl">
        <div>
          <h3 className="text-lg font-medium text-foreground">Subscription & Billing</h3>
          <p className="text-sm text-muted-foreground">Manage your workspace's plan and payment methods.</p>
        </div>

        {activeWorkspace?.subscription_status === 'past_due' && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Payment past due</p>
              <p className="text-sm opacity-90">Please update your payment method to avoid service interruption.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3 pt-4">
          {PLANS.map((plan) => {
            const isActive = currentPlan === plan.id;
            
            return (
              <Card key={plan.id} className={`flex flex-col relative overflow-visible ${isActive ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-blue-500/20 text-blue-400 text-xs font-semibold px-3 py-1 rounded-full border border-blue-500/30">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className={plan.badge ? "pt-8" : ""}>
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <p className="text-sm text-muted-foreground mt-1">{plan.period}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm">
                    {plan.included.map(f => (
                      <li key={f} className="flex items-center gap-3 text-foreground">
                        <Check className="h-4 w-4 shrink-0 text-green-500" />
                        {f}
                      </li>
                    ))}
                    {plan.excluded.map(f => (
                      <li key={f} className="flex items-center gap-3 text-muted-foreground">
                        <X className="h-4 w-4 shrink-0 text-red-500/70" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isActive ? "outline" : "default"}
                    disabled={isActive || loading === plan.id}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {loading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isActive ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {activeWorkspace?.razorpay_subscription_id && (
          <Card className="bg-card border-border mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Billing Portal
              </CardTitle>
              <CardDescription>
                Update your payment method, download invoices, or cancel your subscription.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              {/* Razorpay Customer Portal integration requires backend implementation or manual dashboard linking */}
              <Button variant="outline" onClick={() => toast.info("Customer portal access requires Razorpay Customer Portal enabled in your Razorpay Dashboard.")}>
                Manage Billing
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </>
  );
}
