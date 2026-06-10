import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { memberId, orgId } = await request.json();
    
    if (!memberId || !orgId) {
      return NextResponse.json({ error: 'Member ID and Organization ID are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify requesting user is admin or owner of the org
    const { data: currentMembership } = await adminClient
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single();

    if (!currentMembership || (currentMembership.role !== 'owner' && currentMembership.role !== 'admin')) {
      return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Get the member to be removed
    const { data: targetMember } = await adminClient
      .from('org_members')
      .select('role, user_id')
      .eq('id', memberId)
      .eq('org_id', orgId)
      .single();

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found in this organization' }, { status: 404 });
    }

    // Prevent removing owners
    if (targetMember.role === 'owner') {
      return NextResponse.json({ error: 'Owners cannot be removed. Transfer ownership first.' }, { status: 403 });
    }
    
    // Prevent admins from removing other admins
    if (currentMembership.role === 'admin' && targetMember.role === 'admin') {
       return NextResponse.json({ error: 'Admins cannot remove other admins. Only owners can do this.' }, { status: 403 });
    }

    // Delete the member
    const { error: deleteErr } = await adminClient
      .from('org_members')
      .delete()
      .eq('id', memberId)
      .eq('org_id', orgId);

    if (deleteErr) {
      console.error("Error removing member:", deleteErr);
      return NextResponse.json({ error: 'Failed to remove user from organization' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Remove Member Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
