-- ============================================================
-- 015_razorpay_billing.sql
-- (Updated for the Organizations schema)
-- ============================================================

-- The main billing tables (subscriptions and payment_events) were already created
-- in 015_organizations.sql. However, our Razorpay webhook requires a UNIQUE 
-- constraint on the razorpay_sub_id in order to properly perform "upserts" 
-- (insert or update) when payment events arrive.

ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_razorpay_sub_id_key UNIQUE (razorpay_sub_id);

-- Ensure we have an index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_razorpay_sub_id 
  ON subscriptions(razorpay_sub_id);

-- Same for payment events to query by workspace quickly
CREATE INDEX IF NOT EXISTS idx_payment_events_org_id 
  ON payment_events(org_id);
