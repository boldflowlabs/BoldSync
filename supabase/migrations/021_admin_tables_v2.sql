-- ============================================================
-- 021_admin_tables_v2.sql
-- Add missing tables for the Admin Panel v0.2.0 Phase 1
-- 1. Profiles Super Admin Flag
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- 2. Organizations constraints and missing columns
-- Normalise existing plans to lowercase and trim whitespace
UPDATE organizations SET plan = LOWER(TRIM(plan)) WHERE plan IS NOT NULL;
UPDATE organizations SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;

-- Force invalid or NULL existing data to defaults so the CHECK constraints pass
UPDATE organizations SET plan = 'starter' WHERE plan IS NULL OR plan NOT IN ('starter', 'growth', 'scale');
UPDATE organizations SET status = 'trial' WHERE status IS NULL OR status NOT IN ('trial', 'active', 'suspended', 'inactive');

-- Drop default values first if we want to change types/constraints
ALTER TABLE organizations 
  ALTER COLUMN plan DROP DEFAULT,
  ALTER COLUMN status DROP DEFAULT;

-- Add new columns
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- We won't add strict CHECK constraints directly to existing columns right away 
-- unless we are sure all data matches. Since this is dev, we can add them.
DO $$ BEGIN
  ALTER TABLE organizations ADD CONSTRAINT org_status_check CHECK (status IN ('trial','active','suspended','inactive'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE organizations ADD CONSTRAINT org_plan_check CHECK (plan IN ('starter','growth','scale'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE organizations
  ALTER COLUMN status SET DEFAULT 'trial',
  ALTER COLUMN plan SET DEFAULT 'starter';


-- 2. Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT UNIQUE,
  razorpay_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'created',
  amount INTEGER NOT NULL DEFAULT 0,
  next_billing_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Payment events
CREATE TABLE IF NOT EXISTS payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  razorpay_payment_id TEXT,
  razorpay_event_type TEXT,
  amount INTEGER,
  status TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Admin error log
CREATE TABLE IF NOT EXISTS admin_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  route TEXT,
  error_message TEXT,
  status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- RLS — all admin tables locked to super_admin only
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_error_logs ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subscriptions','payment_events',
    'admin_activity_logs','admin_error_logs'
  ] LOOP
    -- Drop policy if it exists so we can safely re-run
    EXECUTE format('DROP POLICY IF EXISTS "super_admin_only" ON %I', t);
    
    EXECUTE format(
      'CREATE POLICY "super_admin_only" ON %I
       USING (EXISTS (
         SELECT 1 FROM profiles
         WHERE profiles.id = auth.uid()
         AND profiles.is_super_admin = true
       ))', t);
  END LOOP;
END $$;
