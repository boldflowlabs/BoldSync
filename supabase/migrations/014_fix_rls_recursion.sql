-- Fix infinite recursion in workspace_members RLS policy

-- Create a SECURITY DEFINER function to bypass RLS when checking membership
CREATE OR REPLACE FUNCTION public.get_my_workspaces()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid();
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;

-- Create the new non-recursive policy
CREATE POLICY "Users can view workspace members" ON workspace_members FOR SELECT 
USING (workspace_id IN (SELECT public.get_my_workspaces()));
