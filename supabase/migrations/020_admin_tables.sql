-- ============================================================
-- 020_admin_tables.sql
-- New tables for the Global Agency Admin Panel
-- ============================================================

-- 1. Billing Overrides
CREATE TABLE IF NOT EXISTS billing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL, -- e.g. 'comped', 'manual_trial_extension'
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. n8n Services
CREATE TABLE IF NOT EXISTS n8n_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- e.g. 'ai_assistant'
  enabled BOOLEAN DEFAULT false,
  webhook_url TEXT,
  last_called_at TIMESTAMPTZ,
  last_status TEXT, -- 'success', 'failed'
  messages_handled_7d INTEGER DEFAULT 0,
  fallback_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, service_type)
);

-- 3. n8n Call Logs
CREATE TABLE IF NOT EXISTS n8n_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES n8n_services(id) ON DELETE CASCADE,
  payload JSONB,
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  waba_id TEXT,
  message_type TEXT,
  payload_size INTEGER,
  status TEXT, -- 'processed', 'ignored', 'error'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Automation Logs (if not already existing)
CREATE TABLE IF NOT EXISTS automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  trigger_type TEXT,
  status TEXT,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Note: waba_accounts and subscriptions already exist from previous migrations.

-- Enable RLS (super_admin access is managed via the DB service role in code, so we can deny all public/anon access)
ALTER TABLE billing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_logs ENABLE ROW LEVEL SECURITY;
