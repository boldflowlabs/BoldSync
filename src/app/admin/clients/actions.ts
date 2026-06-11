'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createClientOrg(formData: FormData) {
  const businessName = formData.get('businessName') as string;
  const industry = formData.get('industry') as string;
  const ownerName = formData.get('ownerName') as string;
  const ownerEmail = formData.get('ownerEmail') as string;
  const plan = formData.get('plan') as string;
  const status = formData.get('status') as string;

  const adminClient = createAdminClient();

  try {
    // 1. Create or find the user in auth.users
    let userId: string;
    
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers.users.find(u => u.email === ownerEmail);
    
    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new user with a random password, they can reset it later
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: ownerEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: ownerName }
      });
      if (createError || !newUser.user) throw new Error(createError?.message || 'Failed to create user');
      userId = newUser.user.id;
      
      // Send password reset email so they can set their own password
      await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: ownerEmail,
      });
    }

    // 2. Ensure profile exists (trigger usually does this, but we update full_name just in case)
    await adminClient.from('profiles').upsert({
      id: userId,
      full_name: ownerName,
      email: ownerEmail
    });

    // 3. Create the Organization
    const trialEndsAt = status === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null;
    
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: businessName,
        industry: industry,
        plan: plan,
        status: status,
        trial_ends_at: trialEndsAt,
        onboarding_completed: true // Skip onboarding for agency-created clients
      })
      .select()
      .single();

    if (orgError || !org) throw new Error(orgError?.message || 'Failed to create org');

    // 4. Assign the user as the owner
    const { error: memberError } = await adminClient
      .from('org_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: 'owner'
      });

    if (memberError) throw new Error(memberError.message);

    revalidatePath('/admin/clients');
    return org.id;

  } catch (error: any) {
    console.error('Create Org Error:', error);
    // In a real app we'd return { error: message }, but we'll throw for now
    throw error;
  }
}
