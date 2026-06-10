import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api'
import { decrypt } from '@/lib/whatsapp/encryption'

export async function GET(request: Request) {
  // Simple cron auth check (Vercel sets this header for its cron jobs)
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Use the admin client to bypass RLS and fetch all connected accounts
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: accounts, error } = await supabaseAdmin
      .from('waba_accounts')
      .select('id, org_id, waba_id, phone_number_id, access_token_enc, status')
      .eq('status', 'connected')

    if (error) {
      console.error('Failed to fetch waba_accounts:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const results = { total: accounts.length, disconnected: 0, checked: 0 }

    for (const account of accounts) {
      results.checked++
      try {
        const accessToken = decrypt(account.access_token_enc)
        await verifyPhoneNumber({
          phoneNumberId: account.phone_number_id,
          accessToken,
        })
        // If it succeeds, the account is still healthy.
      } catch (err) {
        // Validation failed, mark as disconnected
        console.error(`WABA Account ${account.waba_id} is disconnected:`, err)
        
        await supabaseAdmin
          .from('waba_accounts')
          .update({
            status: 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('id', account.id)

        results.disconnected++

        // Fire n8n alert webhook
        const n8nWebhookUrl = process.env.N8N_WABA_ALERT_WEBHOOK_URL
        if (n8nWebhookUrl) {
          try {
            await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'waba_disconnected',
                org_id: account.org_id,
                waba_id: account.waba_id,
                phone_number_id: account.phone_number_id,
                timestamp: new Date().toISOString()
              })
            })
          } catch (webhookErr) {
            console.error('Failed to trigger n8n alert webhook:', webhookErr)
          }
        }
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    console.error('Error in WABA health check:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
