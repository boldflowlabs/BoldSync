import { createClient } from '@supabase/supabase-js';

// WARNING: This client uses the service_role key and BYPASSES all Row Level Security.
// It must ONLY be used on the server, and ONLY after verifying the user's admin role.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
}
