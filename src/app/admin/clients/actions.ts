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
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: ownerEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: ownerName }
      });
      if (createError || !newUser.user) throw new Error(createError?.message || 'Failed to create user');
      userId = newUser.user.id;
      
      await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: ownerEmail,
      });
    }

    // 2. Ensure profile exists
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
        onboarding_completed: true
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

    // 5. Create WABA entry
    await adminClient.from('waba_accounts').insert({
      org_id: org.id,
      status: 'disconnected'
    });

    // 6. Create n8n service entry
    await adminClient.from('n8n_services').insert({
      org_id: org.id,
      service_name: `${businessName} Automation Service`,
      api_key: Math.random().toString(36).substring(2, 15) // Generate a temporary dummy key
    });

    // 7. Send welcome email/webhook
    if (process.env.N8N_WELCOME_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WELCOME_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'client_created',
            org_id: org.id,
            businessName,
            ownerEmail,
            ownerName,
            plan
          })
        });
      } catch (err) {
        console.error('Failed to send N8N welcome webhook', err);
      }
    }

    // 8. Log activity
    const { data: authData } = await adminClient.auth.getUser();
    const actorId = authData.user?.id || null;

    await adminClient.from('admin_activity_logs').insert({
      org_id: org.id,
      actor_id: actorId, // if the server action is authenticated, it will log the admin
      event_type: 'organization_created',
      metadata: { plan, status, source: 'admin_panel' }
    });

    // 9. Return the org ID to redirect
    revalidatePath('/admin/clients');
    return org.id;

  } catch (error: any) {
    console.error('Create Org Error:', error);
    throw error;
  }
}
