"use client";

import { useState } from 'react';
import { useOrg } from '@/components/org-provider';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import Script from 'next/script';
import { Building2 } from 'lucide-react';

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

export function PaywallModal() {
  const { orgs, activeOrganizationId } = useOrg();
  const [loading, setLoading] = useState<string | null>(null);

  const activeWorkspace = orgs.find(w => w.id === activeOrganizationId);

  const handlePurchase = async (planId: string) => {
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
        description: `Subscribe to ${planId.toUpperCase()} Plan`,
        handler: async function (response: any) {
          try {
            toast.loading("Verifying payment...", { id: 'verify' });
            
            // Synchronously verify payment on backend to avoid webhook delays
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                planId: planId,
                workspaceId: activeOrganizationId
              })
            });

            if (!verifyRes.ok) {
              throw new Error('Verification failed. If you were charged, please contact support.');
            }

            toast.success("Payment successful! Unlocking your dashboard...", { id: 'verify' });
            
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1000);
          } catch (err: any) {
            toast.error(err.message, { id: 'verify' });
          }
        },
        theme: {
          color: "#4f46e5",
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
      <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="relative w-full max-w-5xl my-auto animate-in fade-in zoom-in-95 duration-300">
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4 ring-1 ring-primary/20">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Choose Your Plan</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              You've completed onboarding! To unlock the BoldSync dashboard and invite your team, please select a billing plan.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              return (
                <Card key={plan.id} className="flex flex-col relative overflow-visible border-border bg-card/50 backdrop-blur-md shadow-xl">
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
                      variant={plan.badge ? "default" : "outline"}
                      disabled={loading !== null}
                      onClick={() => handlePurchase(plan.id)}
                    >
                      {loading === plan.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Choose {plan.name}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          
        </div>
      </div>
    </>
  );
}
