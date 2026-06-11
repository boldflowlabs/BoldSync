import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { planId, workspaceId } = await request.json();
    
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    
    // Check if user is super admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    const isSuperAdmin = profile?.is_super_admin === true;

    // Verify user is owner of organization or super admin
    let isOwner = false;
    
    if (!isSuperAdmin) {
      const { data: membership, error } = await adminClient
        .from('org_members')
        .select('role')
        .eq('org_id', workspaceId)
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching membership:", error);
      }
      isOwner = membership?.role === 'owner';
    }

    if (!isOwner && !isSuperAdmin) {
      return NextResponse.json({ error: 'Only workspace owners can manage billing' }, { status: 403 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay keys not configured.");
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    let rpPlanId = '';
    if (planId === 'starter') {
      rpPlanId = process.env.RAZORPAY_PLAN_ID_STARTER!;
    } else if (planId === 'growth') {
      rpPlanId = process.env.RAZORPAY_PLAN_ID_GROWTH!;
    } else if (planId === 'scale') {
      rpPlanId = process.env.RAZORPAY_PLAN_ID_SCALE!;
    }

    if (!rpPlanId) {
      return NextResponse.json({ error: 'Invalid plan or plan not configured' }, { status: 400 });
    }

    // Create a subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: rpPlanId,
      customer_notify: 1,
      total_count: 120, // 10 years
      notes: {
        workspace_id: workspaceId,
        user_id: session.user.id,
        plan: planId
      }
    });

    return NextResponse.json({ 
      subscriptionId: subscription.id,
      keyId: process.env.RAZORPAY_KEY_ID
    });
    
  } catch (error: any) {
    console.error("Razorpay Checkout Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
