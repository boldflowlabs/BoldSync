-- ============================================================
-- 019_onboarding_wizard.sql
-- Adds onboarding completion state and industry/size fields
-- Changes default plan to 'none' to enforce paywall
-- ============================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS company_size TEXT;

-- Change the default plan for new organizations from 'Starter' to 'none'
ALTER TABLE organizations ALTER COLUMN plan SET DEFAULT 'none';

-- For existing organizations that haven't actually purchased a plan, 
-- their plan might be 'Starter' due to the previous default.
-- However, we won't blindly overwrite them here in case they actually paid.
-- We will just ensure all future organizations default to 'none'.
