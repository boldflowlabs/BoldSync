import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Invalid signature or missing secret' }, { status: 400 });
    }

    // Verify Signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    
    // We only care about subscription events (for now)
    const adminClient = createAdminClient();

    if (event.startsWith('subscription.')) {
      const subscription = payload.payload.subscription.entity;
      const workspaceId = subscription.notes?.workspace_id;
      const plan = subscription.notes?.plan;

      if (!workspaceId) {
        console.warn('Webhook received but no workspace_id in notes', subscription.id);
        return NextResponse.json({ success: true }); // Ignore quietly
      }

      // Log payment event
      await adminClient.from('payment_events').insert({
        org_id: workspaceId,
        event_type: event,
        amount: subscription.plan_amount || 0,
        razorpay_event_id: payload.id
      });

      // Update workspace subscription details
      if (event === 'subscription.activated' || event === 'subscription.charged') {
        // Update the main organization status
        await adminClient.from('organizations').update({
          plan: plan || 'pro',
          status: 'active'
        }).eq('id', workspaceId);
        
        // Upsert into subscriptions table
        await adminClient.from('subscriptions').upsert({
          org_id: workspaceId,
          razorpay_customer_id: subscription.customer_id,
          razorpay_sub_id: subscription.id,
          plan: plan || 'pro',
          status: 'active',
          next_billing_at: subscription.charge_at ? new Date(subscription.charge_at * 1000).toISOString() : null
        }, { onConflict: 'razorpay_sub_id' });
        
      } else if (event === 'subscription.cancelled' || event === 'subscription.halted') {
        const newStatus = event === 'subscription.cancelled' ? 'canceled' : 'past_due';
        await adminClient.from('organizations').update({
          status: newStatus
        }).eq('id', workspaceId);
        
        await adminClient.from('subscriptions').update({
          status: newStatus
        }).eq('razorpay_sub_id', subscription.id);
      }
      
      // FIRE N8N WEBHOOK FOR EMAIL NOTIFICATIONS
      if (process.env.N8N_WEBHOOK_BASE_URL) {
        fetch(`${process.env.N8N_WEBHOOK_BASE_URL}/razorpay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: event,
            workspace_id: workspaceId,
            subscription_id: subscription.id,
            plan: plan
          })
        }).catch(err => console.error("Failed to ping n8n:", err));
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Razorpay Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
