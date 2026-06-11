import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guard: Ensure user is super admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', session.user.id)
      .single();

    if (!profile?.is_super_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Find the owner of the organization
    const { data: org } = await adminClient
      .from('organizations')
      .select(`
        owner:org_members(user:profiles(email))
      `)
      .eq('id', id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Org not found' }, { status: 404 });
    }

    const ownerMember = org.owner?.find((m: any) => m.user);
    const ownerUser = ownerMember?.user as any;
    const ownerEmail = ownerUser?.email || ownerUser?.[0]?.email;

    if (!ownerEmail) {
      return NextResponse.json({ error: 'Org has no owner email to impersonate' }, { status: 400 });
    }

    // Generate a magic link for the owner to bypass passwords
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: ownerEmail,
    });

    if (linkError || !linkData?.properties?.action_link) {
      throw new Error(linkError?.message || 'Failed to generate impersonation link');
    }

    // Redirect the admin to the action link which will log them in as the client
    // Note: They will lose their admin session until they log out and log back in as admin.
    return NextResponse.redirect(linkData.properties.action_link);

  } catch (error: any) {
    console.error('Impersonation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
