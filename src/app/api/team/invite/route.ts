import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { email, orgId } = await request.json();
    
    if (!email || !orgId) {
      return NextResponse.json({ error: 'Email and Organization ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify requesting user is admin or owner of the org
    const { data: membership } = await adminClient
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single();

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    // Lookup the user to invite securely via service role
    const { data: profiles, error: profileErr } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('email', email.trim())
      .limit(1);

    if (profileErr || !profiles || profiles.length === 0) {
      // User doesn't exist, send a Supabase Invite!
      const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email.trim(), {
        data: {
          invited_org_id: orgId
        }
      });

      if (inviteErr) {
        console.error("Invite sending error:", inviteErr);
        return NextResponse.json({ error: "Failed to send invite email." }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Invite email sent!" });
    }

    const userIdToInvite = profiles[0].user_id;

    // Check if already in org
    const { data: existing } = await adminClient
      .from('org_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userIdToInvite);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'User is already in this organization' }, { status: 409 });
    }

    // Insert user into org_members
    const { error: insertErr } = await adminClient
      .from('org_members')
      .insert({
        org_id: orgId,
        user_id: userIdToInvite,
        role: 'member'
      });

    if (insertErr) {
      console.error("Error inserting member:", insertErr);
      return NextResponse.json({ error: 'Failed to add user to organization' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Invite Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
