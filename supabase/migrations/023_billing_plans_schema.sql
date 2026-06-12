-- ============================================================
-- 023_billing_plans_schema.sql
-- Create the plans table to enforce billing tiers and limits
-- ============================================================

CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  razorpay_plan_id TEXT,
  monthly_price NUMERIC(10, 2),
  message_limit INTEGER NOT NULL DEFAULT 0,
  ai_query_limit INTEGER NOT NULL DEFAULT 0,
  contact_limit INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Plans are viewable by all authenticated users" ON public.plans;
CREATE POLICY "Plans are viewable by all authenticated users" ON public.plans FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert default tiers (Starter, Growth, Scale)
INSERT INTO public.plans (id, name, message_limit, ai_query_limit, contact_limit, monthly_price) VALUES 
('Starter', 'Starter Plan', 1000, 100, 500, 49.00),
('Growth', 'Growth Plan', 10000, 1000, 5000, 149.00),
('Scale', 'Scale Plan', 100000, 10000, 50000, 499.00)
ON CONFLICT (id) DO UPDATE SET 
  message_limit = EXCLUDED.message_limit,
  ai_query_limit = EXCLUDED.ai_query_limit,
  contact_limit = EXCLUDED.contact_limit,
  monthly_price = EXCLUDED.monthly_price;

-- Add foreign key constraint to subscriptions if possible
-- Subscriptions currently uses `plan TEXT`. We can add a constraint checking that it exists in plans.id
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'subscriptions') THEN
    -- Try to add the FK if it doesn't exist
    BEGIN
      ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_fkey FOREIGN KEY (plan) REFERENCES public.plans(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      -- Ignore if constraint already exists
    END;
  END IF;
END $$;
