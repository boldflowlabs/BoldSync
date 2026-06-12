import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type LimitType = 'messages' | 'ai_queries' | 'contacts';

export async function checkUsageLimit(orgId: string, limitType: LimitType): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // Using service role key for admin RPC calls
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore error when setting cookies in Server Components
          }
        },
      },
    }
  );

  const { data, error } = await supabase.rpc('check_usage_limit', {
    target_org_id: orgId,
    limit_type: limitType,
  });

  if (error) {
    console.error(`Error checking usage limit for org ${orgId}:`, error);
    return false; // Fail safe by denying if we can't check
  }

  return !!data;
}
