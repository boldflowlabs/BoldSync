'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function updateOrgStatus(orgId: string, status: string) {
  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from('organizations')
    .update({ status })
    .eq('id', orgId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/clients/${orgId}/billing`);
  revalidatePath(`/admin/clients`);
}

export async function updateOrgPlan(orgId: string, plan: string) {
  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from('organizations')
    .update({ plan })
    .eq('id', orgId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/admin/clients/${orgId}/billing`);
  revalidatePath(`/admin/clients`);
}
