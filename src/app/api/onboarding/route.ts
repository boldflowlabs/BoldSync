import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const { orgId, name, industry, companySize } = await request.json();
    
    if (!orgId || !name || !industry || !companySize) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify requesting user is owner of the org
    const { data: membership } = await adminClient
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', session.user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can complete onboarding for this organization' }, { status: 403 });
    }

    // Update the organization
    const { error: updateErr } = await adminClient
      .from('organizations')
      .update({
        name: name,
        industry: industry,
        company_size: companySize,
        onboarding_completed: true
      })
      .eq('id', orgId);

    if (updateErr) {
      console.error("Error updating organization:", updateErr);
      return NextResponse.json({ error: 'Failed to save onboarding details' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error("Onboarding Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
