-- ============================================================
-- 013_workspaces.sql
-- Adds multi-tenancy Workspaces to the schema.
-- ============================================================

-- 1. Create tables
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Trigger for workspaces
CREATE TRIGGER set_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Add workspace_id columns
ALTER TABLE contacts ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE tags ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE custom_fields ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE contact_notes ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE conversations ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE whatsapp_config ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE message_templates ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE pipelines ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE broadcasts ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE automations ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE automation_logs ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- 3. Data Migration (Idempotent)
DO $$
DECLARE
  uid UUID;
  new_ws_id UUID;
  ws_name TEXT;
BEGIN
  FOR uid IN 
    SELECT user_id FROM profiles
    UNION SELECT user_id FROM contacts
    UNION SELECT user_id FROM tags
    UNION SELECT user_id FROM custom_fields
    UNION SELECT user_id FROM conversations
    UNION SELECT user_id FROM whatsapp_config
    UNION SELECT user_id FROM message_templates
    UNION SELECT user_id FROM pipelines
    UNION SELECT user_id FROM deals
    UNION SELECT user_id FROM broadcasts
    UNION SELECT user_id FROM automations
    UNION SELECT user_id FROM automation_logs
  LOOP
    -- Get name from profiles if exists
    SELECT COALESCE(NULLIF(full_name, ''), 'My') || '''s Workspace' INTO ws_name 
    FROM profiles WHERE user_id = uid LIMIT 1;
    
    IF ws_name IS NULL THEN
      ws_name := 'My Workspace';
    END IF;

    -- Check if user already has a workspace
    IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = uid) THEN
      INSERT INTO workspaces (name, owner_id) 
      VALUES (ws_name, uid)
      RETURNING id INTO new_ws_id;

      INSERT INTO workspace_members (workspace_id, user_id, role)
      VALUES (new_ws_id, uid, 'owner');
    ELSE
      SELECT id INTO new_ws_id FROM workspaces WHERE owner_id = uid LIMIT 1;
    END IF;

    -- Update records
    UPDATE contacts SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE tags SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE custom_fields SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE contact_notes SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE conversations SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE whatsapp_config SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE message_templates SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE pipelines SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE deals SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE broadcasts SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE automations SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
    UPDATE automation_logs SET workspace_id = new_ws_id WHERE user_id = uid AND workspace_id IS NULL;
  END LOOP;

  -- Clean up any impossible orphans before enforcing NOT NULL
  DELETE FROM contacts WHERE workspace_id IS NULL;
  DELETE FROM tags WHERE workspace_id IS NULL;
  DELETE FROM custom_fields WHERE workspace_id IS NULL;
  DELETE FROM contact_notes WHERE workspace_id IS NULL;
  DELETE FROM conversations WHERE workspace_id IS NULL;
  DELETE FROM whatsapp_config WHERE workspace_id IS NULL;
  DELETE FROM message_templates WHERE workspace_id IS NULL;
  DELETE FROM pipelines WHERE workspace_id IS NULL;
  DELETE FROM deals WHERE workspace_id IS NULL;
  DELETE FROM broadcasts WHERE workspace_id IS NULL;
  DELETE FROM automations WHERE workspace_id IS NULL;
  DELETE FROM automation_logs WHERE workspace_id IS NULL;
END $$;

-- 4. Auto-populate workspace_id on insert if missing
CREATE OR REPLACE FUNCTION public.set_default_workspace_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.workspace_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.workspace_id := (SELECT workspace_id FROM workspace_members WHERE user_id = NEW.user_id ORDER BY created_at ASC LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_workspace_id_contacts ON contacts;
CREATE TRIGGER set_workspace_id_contacts BEFORE INSERT ON contacts FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_tags BEFORE INSERT ON tags FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_custom_fields BEFORE INSERT ON custom_fields FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_conversations BEFORE INSERT ON conversations FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_whatsapp_config BEFORE INSERT ON whatsapp_config FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_message_templates BEFORE INSERT ON message_templates FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_pipelines BEFORE INSERT ON pipelines FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_deals BEFORE INSERT ON deals FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_broadcasts BEFORE INSERT ON broadcasts FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_automations BEFORE INSERT ON automations FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();
CREATE TRIGGER set_workspace_id_automation_logs BEFORE INSERT ON automation_logs FOR EACH ROW EXECUTE FUNCTION public.set_default_workspace_id();

-- 5. Make columns NOT NULL now that data is migrated
ALTER TABLE contacts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE tags ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE custom_fields ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE whatsapp_config ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE message_templates ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE pipelines ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE deals ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE broadcasts ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE automations ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE automation_logs ALTER COLUMN workspace_id SET NOT NULL;

-- 6. Auto-create Workspace for future signups
CREATE OR REPLACE FUNCTION public.handle_new_user_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_ws_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Workspace', NEW.id)
  RETURNING id INTO new_ws_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_ws_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_workspace();

-- 6. Rewrite RLS Policies for Workspaces
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspaces
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
CREATE POLICY "Users can view own workspaces" ON workspaces FOR ALL
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid()));

-- Workspace Members
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members" ON workspace_members FOR ALL
USING (EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()));

-- Contacts
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage workspace contacts" ON contacts FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = contacts.workspace_id AND user_id = auth.uid()));

-- Tags
DROP POLICY IF EXISTS "Users can manage own tags" ON tags;
CREATE POLICY "Users can manage workspace tags" ON tags FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tags.workspace_id AND user_id = auth.uid()));

-- Custom Fields
DROP POLICY IF EXISTS "Users can manage own custom fields" ON custom_fields;
CREATE POLICY "Users can manage workspace custom fields" ON custom_fields FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = custom_fields.workspace_id AND user_id = auth.uid()));

-- Contact Notes
DROP POLICY IF EXISTS "Users can manage own notes" ON contact_notes;
CREATE POLICY "Users can manage workspace notes" ON contact_notes FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = contact_notes.workspace_id AND user_id = auth.uid()));

-- Conversations
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Users can manage workspace conversations" ON conversations FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = conversations.workspace_id AND user_id = auth.uid()));

-- Whatsapp Config
DROP POLICY IF EXISTS "Users can manage own config" ON whatsapp_config;
CREATE POLICY "Users can manage workspace config" ON whatsapp_config FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = whatsapp_config.workspace_id AND user_id = auth.uid()));

-- Message Templates
DROP POLICY IF EXISTS "Users can manage own templates" ON message_templates;
CREATE POLICY "Users can manage workspace templates" ON message_templates FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = message_templates.workspace_id AND user_id = auth.uid()));

-- Pipelines
DROP POLICY IF EXISTS "Users can manage own pipelines" ON pipelines;
CREATE POLICY "Users can manage workspace pipelines" ON pipelines FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = pipelines.workspace_id AND user_id = auth.uid()));

-- Deals
DROP POLICY IF EXISTS "Users can manage own deals" ON deals;
CREATE POLICY "Users can manage workspace deals" ON deals FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = deals.workspace_id AND user_id = auth.uid()));

-- Broadcasts
DROP POLICY IF EXISTS "Users can manage own broadcasts" ON broadcasts;
CREATE POLICY "Users can manage workspace broadcasts" ON broadcasts FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = broadcasts.workspace_id AND user_id = auth.uid()));

-- Automations
DROP POLICY IF EXISTS "Users can manage own automations" ON automations;
CREATE POLICY "Users can manage workspace automations" ON automations FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = automations.workspace_id AND user_id = auth.uid()));

-- Automation Logs
DROP POLICY IF EXISTS "Users can view automation logs" ON automation_logs;
CREATE POLICY "Users can view workspace automation logs" ON automation_logs FOR ALL 
USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = automation_logs.workspace_id AND user_id = auth.uid()));
