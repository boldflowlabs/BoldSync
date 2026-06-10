import { NextResponse } from 'next/server'
import { createClient, getSessionOrgId } from '@/lib/supabase/server'
import { encrypt } from '@/lib/whatsapp/encryption'

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
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 })
    }

    // Phase 2: In a real implementation, we would:
    // 1. Exchange the code for a user access token.
    // 2. Exchange the user access token for a system user permanent token.
    // 3. Fetch the shared waba_id and phone_number_id from the graph API.
    // Since this is a placeholder without actual Meta App Credentials, we return an error indicating it's not fully configured yet.

    return NextResponse.json(
      { error: 'Meta Embedded Signup is not fully configured. Missing App ID, Client Token, and Config ID in environment variables. Please use Manual Configuration for now.' },
      { status: 501 }
    )

  } catch (error) {
    console.error('Error in Embedded Signup POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
