import { NextResponse } from 'next/server'
import { createClient, getSessionOrgId } from '@/lib/supabase/server'
import {
  uploadMediaToMeta,
  sendMediaMessage,
} from '@/lib/whatsapp/meta-api'
import { decrypt, encrypt, isLegacyFormat } from '@/lib/whatsapp/encryption'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import {
  sanitizePhoneForMeta,
  isValidE164,
  phoneVariants,
  isRecipientNotAllowedError,
} from '@/lib/whatsapp/phone-utils'
import {
  checkRateLimit,
  rateLimitResponse,
  RATE_LIMITS,
} from '@/lib/rate-limit'

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

    const limit = checkRateLimit(`send-media:${orgId}`, RATE_LIMITS.send)
    if (!limit.success) {
      return rateLimitResponse(limit)
    }

    const formData = await request.formData()
    const conversation_id = formData.get('conversation_id') as string | null
    const message_type = formData.get('message_type') as 'image' | 'document' | 'audio' | 'video' | null
    const caption = formData.get('caption') as string | null
    const reply_to_message_id = formData.get('reply_to_message_id') as string | null
    const file = formData.get('file') as Blob | null

    if (!conversation_id || !message_type || !file) {
      return NextResponse.json(
        { error: 'conversation_id, message_type, and file are required' },
        { status: 400 }
      )
    }

    // Fetch conversation and contact
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversation_id)
      .eq('org_id', orgId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const contact = conversation.contact
    if (!contact?.phone) {
      return NextResponse.json(
        { error: 'Contact phone number not found' },
        { status: 400 }
      )
    }

    const sanitizedPhone = sanitizePhoneForMeta(contact.phone)
    if (!isValidE164(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // Fetch and decrypt WhatsApp config
    const { data: config, error: configError } = await supabase
      .from('waba_accounts')
      .select('*')
      .eq('org_id', orgId)
      .single()

    if (configError || !config) {
      return NextResponse.json(
        { error: 'WhatsApp not configured.' },
        { status: 400 }
      )
    }

    const accessToken = decrypt(config.access_token_enc)

    // Upgrade token format if legacy
    if (isLegacyFormat(config.access_token_enc)) {
      void supabase
        .from('waba_accounts')
        .update({ access_token_enc: encrypt(accessToken) })
        .eq('id', config.id)
        .then(({ error }) => {
          if (error) {
            console.warn('[whatsapp/send-media] token upgrade failed:', error.message)
          }
        })
    }

    // Resolve context message
    let contextMessageId: string | undefined
    if (reply_to_message_id) {
      const { data: parent } = await supabase
        .from('messages')
        .select('message_id')
        .eq('id', reply_to_message_id)
        .eq('conversation_id', conversation_id)
        .maybeSingle()

      if (parent?.message_id) {
        contextMessageId = parent.message_id
      }
    }

    // 1) Upload the file to Meta
    let mediaId: string
    try {
      mediaId = await uploadMediaToMeta({
        phoneNumberId: config.phone_number_id,
        accessToken,
        file,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        { error: `Media upload failed: ${message}` },
        { status: 502 }
      )
    }

    // 2) Send the message
    let waMessageId = ''
    let workingPhone = sanitizedPhone

    const attempt = async (phone: string): Promise<string> => {
      const result = await sendMediaMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: phone,
        type: message_type,
        mediaId,
        caption: caption || undefined,
        filename: message_type === 'document' ? (file as File).name : undefined,
        contextMessageId,
      })
      return result.messageId
    }

    try {
      const variants = phoneVariants(sanitizedPhone)
      let lastError: unknown = null

      for (const variant of variants) {
        try {
          waMessageId = await attempt(variant)
          workingPhone = variant
          lastError = null
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          if (!isRecipientNotAllowedError(message)) {
            throw err
          }
          lastError = err
        }
      }

      if (lastError) throw lastError
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Meta API error'
      return NextResponse.json(
        { error: `Meta API error: ${message}` },
        { status: 502 }
      )
    }

    if (workingPhone !== sanitizedPhone) {
      await supabase
        .from('contacts')
        .update({ phone: workingPhone })
        .eq('id', contact.id)
    }

    // We don't save the raw file in Supabase to save bandwidth; we only save
    // the mediaUrl proxy link pointing to Meta's CDN so the UI can render it.
    const mediaUrl = `/api/whatsapp/media/${mediaId}`

    const { data: messageRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_type: 'agent',
        content_type: message_type,
        content_text: caption || null, // caption goes to text for UI
        media_url: mediaUrl,
        message_id: waMessageId,
        status: 'sent',
        reply_to_message_id: reply_to_message_id || null,
      })
      .select()
      .single()

    if (msgError) {
      console.error('Error inserting sent message:', msgError)
      return NextResponse.json(
        { error: `Saved to Meta but failed in DB: ${msgError.message}` },
        { status: 500 }
      )
    }

    await supabase
      .from('conversations')
      .update({
        last_message_text: caption ? `🖼️ ${caption}` : `[${message_type}]`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    // Pause flows
    try {
      await supabaseAdmin()
        .from('flow_runs')
        .update({
          status: 'paused_by_agent',
          ended_at: new Date().toISOString(),
          end_reason: 'agent_replied',
        })
        .eq('org_id', orgId)
        .eq('contact_id', contact.id)
        .eq('status', 'active')
    } catch (err) {
      console.error('[flows] pause-on-agent-send threw:', err)
    }

    return NextResponse.json({
      success: true,
      message_id: messageRecord.id,
      whatsapp_message_id: waMessageId,
    })
  } catch (error) {
    console.error('Error in WhatsApp send-media POST:', error)
    return NextResponse.json(
      { error: 'Failed to send media message' },
      { status: 500 }
    )
  }
}
