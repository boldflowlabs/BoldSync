-- ============================================================
-- 022_rls_org_id_enforcement.sql
-- Update RLS policies to use auth.jwt()->>'org_id' for performance
-- and strict tenant isolation, avoiding recursive lookups.
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'contacts', 'tags', 'custom_fields', 'contact_notes', 'conversations', 
    'messages', 'broadcast_recipients',
    'whatsapp_config', 'message_templates', 'pipelines', 'pipeline_stages', 'deals', 'broadcasts', 
    'automations', 'automation_logs', 'automation_steps', 'automation_pending_executions',
    'subscriptions', 'waba_accounts', 
    'knowledge_chunks', 'ai_query_logs', 'drip_sequences', 'payment_events', 
    'notifications', 'usage_metrics', 'flows', 'flow_runs', 'flow_nodes', 'flow_run_events',
    'billing_overrides', 'n8n_services', 'n8n_call_logs', 'webhook_logs',
    'admin_activity_logs', 'admin_error_logs'
  ])
  LOOP
    -- Ensure table exists and has RLS enabled before applying
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      
      -- Drop the previous policy
      BEGIN
        EXECUTE format('DROP POLICY IF EXISTS "Org Access Policy" ON public.%I;', t);
      EXCEPTION WHEN undefined_object THEN
        -- Ignore
      END;

      -- Check if org_id column exists
      IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id') THEN
        -- Create new policy based on JWT claim
        EXECUTE format('
          CREATE POLICY "Org Access Policy" ON public.%I FOR ALL 
          USING (org_id = (auth.jwt()->>''org_id'')::uuid);
        ', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Update specific tables with indirect org_id (like drip_steps, drip_enrollments)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drip_steps') THEN
    DROP POLICY IF EXISTS "Org Access Policy" ON public.drip_steps;
    CREATE POLICY "Org Access Policy" ON public.drip_steps FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.drip_sequences 
      WHERE id = drip_steps.sequence_id AND org_id = (auth.jwt()->>'org_id')::uuid
    ));
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'drip_enrollments') THEN
    DROP POLICY IF EXISTS "Org Access Policy" ON public.drip_enrollments;
    CREATE POLICY "Org Access Policy" ON public.drip_enrollments FOR ALL
    USING (EXISTS (
      SELECT 1 FROM public.drip_sequences 
      WHERE id = drip_enrollments.sequence_id AND org_id = (auth.jwt()->>'org_id')::uuid
    ));
  END IF;
END $$;

-- Organizations table itself
DROP POLICY IF EXISTS "Users can access own organizations" ON public.organizations;
CREATE POLICY "Users can access own organizations" ON public.organizations FOR ALL
USING (id = (auth.jwt()->>'org_id')::uuid OR user_has_org_access(id));

-- Org Members
DROP POLICY IF EXISTS "Users can access org members" ON public.org_members;
CREATE POLICY "Users can access org members" ON public.org_members FOR ALL
USING (org_id = (auth.jwt()->>'org_id')::uuid OR user_has_org_access(org_id));
