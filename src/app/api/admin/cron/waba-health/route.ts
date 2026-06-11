import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure it's not statically cached

export async function GET(request: Request) {
  try {
    // 1. Verify Authorization
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.ADMIN_CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 2. Fetch active WABA accounts
    const { data: wabas, error: fetchError } = await adminClient
      .from('waba_accounts')
      .select('id, waba_id, org_id, status')
      .neq('status', 'disconnected');

    if (fetchError) throw fetchError;

    const results = {
      total_checked: wabas?.length || 0,
      healthy: 0,
      failed: 0,
      errors: [] as string[]
    };

    // 3. Simulate checking Meta API for health
    // In a real scenario, we would decrypt the access token and ping WhatsApp Graph API
    for (const waba of wabas || []) {
      try {
        // Mock API check logic
        const isHealthy = true; // Pretend we got a 200 OK from Meta
        
        if (isHealthy) {
          results.healthy++;
        } else {
          // If failed, mark as disconnected and log alert
          await adminClient
            .from('waba_accounts')
            .update({ status: 'disconnected', updated_at: new Date().toISOString() })
            .eq('id', waba.id);
            
          await adminClient.from('admin_activity_logs').insert({
            org_id: waba.org_id,
            event_type: 'waba_disconnected',
            metadata: { source: 'cron_health_check', waba_id: waba.waba_id }
          });
          
          results.failed++;
        }
      } catch (err: any) {
        results.errors.push(`Failed to check WABA ${waba.id}: ${err.message}`);
        results.failed++;
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('WABA Health Cron Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
