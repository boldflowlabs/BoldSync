-- ============================================================
-- 018_org_invites_trigger.sql
-- Modifies the new user trigger to handle Supabase Auth invites
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- If the user was invited via Supabase Auth admin.inviteUserByEmail
  -- we injected the invited_org_id into their metadata.
  IF NEW.raw_user_meta_data->>'invited_org_id' IS NOT NULL THEN
    -- Add them to the org they were invited to
    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES ((NEW.raw_user_meta_data->>'invited_org_id')::UUID, NEW.id, 'member');
  ELSE
    -- Normal signup: Create a new organization for them
    INSERT INTO public.organizations (name, owner_id)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Organization', NEW.id)
    RETURNING id INTO new_org_id;

    INSERT INTO public.org_members (org_id, user_id, role)
    VALUES (new_org_id, NEW.id, 'owner');
  END IF;
  
  RETURN NEW;
END;
$$;
