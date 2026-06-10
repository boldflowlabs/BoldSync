import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, planId, workspaceId } = await request.json();
    
    if (!razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification details' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify signature using the razorpay secret
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("Razorpay secret not configured");
    }

    // For subscriptions, the signature payload is: razorpay_payment_id + '|' + razorpay_subscription_id
    const payload = razorpay_payment_id + '|' + razorpay_subscription_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Signature is valid, update the organization's plan immediately
    // This acts as a synchronous fallback to the webhook.
    await adminClient.from('organizations').update({
      plan: planId || 'pro',
      status: 'active'
    }).eq('id', workspaceId);

    // Also update subscriptions table
    await adminClient.from('subscriptions').upsert({
      org_id: workspaceId,
      razorpay_sub_id: razorpay_subscription_id,
      plan: planId || 'pro',
      status: 'active'
    }, { onConflict: 'razorpay_sub_id' });

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Razorpay Verification Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
