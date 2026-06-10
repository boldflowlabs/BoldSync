-- Add verify_token to waba_accounts
ALTER TABLE waba_accounts ADD COLUMN IF NOT EXISTS verify_token TEXT;
