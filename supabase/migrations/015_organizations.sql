-- ============================================================
-- 015_organizations.sql
-- Transition from workspaces to organizations and full multi-tenancy
-- ============================================================

-- 1. Rename existing workspaces tables to organizations
ALTER TABLE workspaces RENAME TO organizations;
ALTER TABLE workspace_members RENAME TO org_members;

-- Rename constraints and indexes for organizations
ALTER TABLE organizations RENAME CONSTRAINT workspaces_pkey TO organizations_pkey;
ALTER TABLE org_members RENAME CONSTRAINT workspace_members_pkey TO org_members_pkey;

-- 2. Add new columns to organizations according to specs
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'Starter',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Generate slug if empty
UPDATE organizations SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-', 'g')) WHERE slug IS NULL;
ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE(slug);

-- 3. Update org_members columns
ALTER TABLE org_members RENAME COLUMN workspace_id TO org_id;
ALTER TABLE org_members 
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Create new feature tables
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_sub_id TEXT,
  razorpay_customer_id TEXT,
  plan TEXT,
  status TEXT,
  next_billing_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id TEXT,
  content TEXT,
  -- Note: requires pgvector extension, which we will enable
  -- embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_query_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  query TEXT,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drip_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drip_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  template_id UUID REFERENCES message_templates(id),
  delay_hours INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drip_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES drip_sequences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT,
  amount NUMERIC(10, 2),
  razorpay_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flag_name TEXT NOT NULL,
  enabled_globally BOOLEAN DEFAULT FALSE,
  org_overrides JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  messages_sent INTEGER DEFAULT 0,
  broadcasts_sent INTEGER DEFAULT 0,
  ai_queries INTEGER DEFAULT 0,
  contacts_count INTEGER DEFAULT 0,
  UNIQUE(org_id, date)
);

-- 5. Rename workspace_id to org_id in all tables
ALTER TABLE contacts RENAME COLUMN workspace_id TO org_id;
ALTER TABLE tags RENAME COLUMN workspace_id TO org_id;
ALTER TABLE custom_fields RENAME COLUMN workspace_id TO org_id;
ALTER TABLE contact_notes RENAME COLUMN workspace_id TO org_id;
ALTER TABLE conversations RENAME COLUMN workspace_id TO org_id;
ALTER TABLE whatsapp_config RENAME COLUMN workspace_id TO org_id;
ALTER TABLE message_templates RENAME COLUMN workspace_id TO org_id;
ALTER TABLE pipelines RENAME COLUMN workspace_id TO org_id;
ALTER TABLE deals RENAME COLUMN workspace_id TO org_id;
ALTER TABLE broadcasts RENAME COLUMN workspace_id TO org_id;
ALTER TABLE automations RENAME COLUMN workspace_id TO org_id;
ALTER TABLE automation_logs RENAME COLUMN workspace_id TO org_id;

-- 6. Add waba_accounts table
CREATE TABLE IF NOT EXISTS waba_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  waba_id TEXT,
  phone_number_id TEXT,
  access_token_enc TEXT,
  status TEXT DEFAULT 'disconnected',
  message_tier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. current_org_id function
CREATE OR REPLACE FUNCTION current_org_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'org_id', '')::UUID;
$$ LANGUAGE sql STABLE;

-- 8. Redefine RLS Policies to use current_org_id() or fallback to auth.uid() lookup
-- Since current_org_id requires JWT injection (which we will implement), we'll do a robust check
CREATE OR REPLACE FUNCTION user_has_org_access(target_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members 
    WHERE org_id = target_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own workspaces" ON organizations;
CREATE POLICY "Users can access own organizations" ON organizations FOR ALL
USING (user_has_org_access(id));

-- Org Members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view workspace members" ON org_members;
CREATE POLICY "Users can access org members" ON org_members FOR ALL
USING (user_has_org_access(org_id));

-- Function to apply policies
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'contacts', 'tags', 'custom_fields', 'contact_notes', 'conversations', 
    'whatsapp_config', 'message_templates', 'pipelines', 'deals', 'broadcasts', 
    'automations', 'automation_logs', 'subscriptions', 'waba_accounts', 
    'knowledge_chunks', 'ai_query_logs', 'drip_sequences', 'payment_events', 
    'notifications', 'usage_metrics', 'flows', 'flow_runs'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Drop old workspace policies if they exist
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Users can manage workspace %I" ON %I;', t, t);
    EXCEPTION WHEN undefined_object THEN
      -- Ignore
    END;

    EXECUTE format('
      DROP POLICY IF EXISTS "Org Access Policy" ON %I;
      CREATE POLICY "Org Access Policy" ON %I FOR ALL 
      USING (user_has_org_access(org_id));
    ', t, t);
  END LOOP;
END $$;

-- Custom RLS for drip_steps (via sequence_id)
ALTER TABLE drip_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org Access Policy" ON drip_steps;
CREATE POLICY "Org Access Policy" ON drip_steps FOR ALL
USING (EXISTS (
  SELECT 1 FROM drip_sequences 
  WHERE id = drip_steps.sequence_id AND user_has_org_access(org_id)
));

-- Custom RLS for drip_enrollments (via sequence_id)
ALTER TABLE drip_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Org Access Policy" ON drip_enrollments;
CREATE POLICY "Org Access Policy" ON drip_enrollments FOR ALL
USING (EXISTS (
  SELECT 1 FROM drip_sequences 
  WHERE id = drip_enrollments.sequence_id AND user_has_org_access(org_id)
));

-- 9. Trigger for new user to create organization
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Organization', NEW.id)
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;

CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_organization();

-- 10. Update the default org_id trigger
CREATE OR REPLACE FUNCTION public.set_default_org_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.org_id := (SELECT org_id FROM org_members WHERE user_id = NEW.user_id ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'contacts', 'tags', 'custom_fields', 'conversations', 
    'whatsapp_config', 'message_templates', 'pipelines', 'deals', 'broadcasts', 
    'automations', 'automation_logs'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_workspace_id_%I ON %I;', t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS set_org_id_%I ON %I;', t, t);
    EXECUTE format('CREATE TRIGGER set_org_id_%I BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION public.set_default_org_id();', t, t);
  END LOOP;
END $$;
