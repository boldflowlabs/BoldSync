"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2, X, Lock } from 'lucide-react';
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

export function AdminCheckout({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (planId: string) => {
    try {
      setLoading(planId);
      const res = await fetch('/api/razorpay/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, workspaceId: orgId })
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
                workspaceId: orgId
              })
            });

            if (!verifyRes.ok) {
              throw new Error('Verification failed. If you were charged, please contact support.');
            }

            toast.success("Payment successful! The org plan is upgraded.", { id: 'verify' });
            setTimeout(() => {
              window.location.reload();
            }, 1500);
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
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Generate Checkout Link</h2>
          <p className="text-sm text-muted-foreground">
            Clicking a button below will open Razorpay. You can complete the checkout on behalf of the client using your agency card, or you can copy the checkout link to send to them (coming soon).
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
