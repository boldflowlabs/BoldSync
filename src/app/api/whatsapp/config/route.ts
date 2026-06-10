import { NextResponse } from 'next/server'
import { createClient, getSessionOrgId } from '@/lib/supabase/server'
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api'
import { encrypt, decrypt } from '@/lib/whatsapp/encryption'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = await getSessionOrgId()
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { data: config, error: configError } = await supabase
      .from('waba_accounts')
      .select('phone_number_id, access_token_enc, status, verify_token')
      .eq('org_id', orgId)
      .maybeSingle()

    if (configError) {
      console.error('Error fetching waba_accounts:', configError)
      return NextResponse.json(
        { connected: false, reason: 'db_error', message: 'Failed to fetch configuration' },
        { status: 200 }
      )
    }

    if (!config) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          message: 'No WhatsApp configuration saved yet. Fill in the form and click Save Configuration.',
          verify_token: '',
        },
        { status: 200 }
      )
    }

    let accessToken: string
    try {
      accessToken = decrypt(config.access_token_enc)
    } catch (err) {
      console.error('[whatsapp/config GET] Token decryption failed:', err)
      return NextResponse.json(
        {
          connected: false,
          reason: 'token_corrupted',
          needs_reset: true,
          message:
            'The stored access token cannot be decrypted with the current ENCRYPTION_KEY. Click "Reset Configuration" below, then re-save.',
          verify_token: config.verify_token || '',
        },
        { status: 200 }
      )
    }

    // Validate credentials against Meta
    try {
      const phoneInfo = await verifyPhoneNumber({
        phoneNumberId: config.phone_number_id,
        accessToken,
      })
      return NextResponse.json({ 
        connected: true, 
        phone_info: phoneInfo,
        verify_token: config.verify_token || ''
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('[whatsapp/config GET] Meta API verification failed:', message)
      return NextResponse.json(
        {
          connected: false,
          reason: 'meta_api_error',
          message: `Meta API rejected the credentials: ${message}`,
          verify_token: config.verify_token || '',
        },
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in WhatsApp config GET:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = await getSessionOrgId()
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const body = await request.json()
    const { phone_number_id, waba_id, access_token, verify_token } = body

    if (!access_token || !phone_number_id || !waba_id || !verify_token) {
      return NextResponse.json(
        { error: 'access_token, waba_id, phone_number_id, and verify_token are required' },
        { status: 400 }
      )
    }

    // Verify credentials with Meta BEFORE saving
    let phoneInfo
    try {
      phoneInfo = await verifyPhoneNumber({
        phoneNumberId: phone_number_id,
        accessToken: access_token,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      console.error('Meta API verification failed during save:', message)
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 400 }
      )
    }

    let encryptedAccessToken: string
    try {
      encryptedAccessToken = encrypt(access_token)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown encryption error'
      console.error('Encryption failed:', message)
      return NextResponse.json(
        { error: 'Failed to encrypt token.' },
        { status: 500 }
      )
    }

    const { data: existing } = await supabase
      .from('waba_accounts')
      .select('id')
      .eq('org_id', orgId)
      .maybeSingle()

    if (existing) {
      const { error: updateError } = await supabase
        .from('waba_accounts')
        .update({
          phone_number_id,
          waba_id,
          access_token_enc: encryptedAccessToken,
          verify_token,
          status: 'connected',
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)

      if (updateError) {
        console.error('Error updating waba_accounts:', updateError)
        return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('waba_accounts')
        .insert({
          org_id: orgId,
          phone_number_id,
          waba_id,
          access_token_enc: encryptedAccessToken,
          verify_token,
          status: 'connected',
        })

      if (insertError) {
        console.error('Error inserting waba_accounts:', insertError)
        return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, phone_info: phoneInfo })
  } catch (error) {
    console.error('Error in WhatsApp config POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = await getSessionOrgId()
    if (!orgId) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('waba_accounts')
      .delete()
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('Error deleting waba_accounts:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in WhatsApp config DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
