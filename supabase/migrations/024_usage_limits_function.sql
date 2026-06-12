-- ============================================================
-- 024_usage_limits_function.sql
-- Function to quickly check if an organization has exceeded its limits
-- ============================================================

CREATE OR REPLACE FUNCTION check_usage_limit(target_org_id UUID, limit_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_usage INTEGER;
  max_limit INTEGER;
  org_plan TEXT;
BEGIN
  -- Get the current plan from subscriptions or fallback to organizations plan
  SELECT COALESCE(s.plan, o.plan, 'Starter') INTO org_plan
  FROM organizations o
  LEFT JOIN subscriptions s ON s.org_id = o.id AND s.status = 'active'
  WHERE o.id = target_org_id
  ORDER BY s.created_at DESC LIMIT 1;

  -- Get the limit for this plan
  IF limit_type = 'messages' THEN
    SELECT message_limit INTO max_limit FROM plans WHERE id = org_plan;
    -- Count usage for current month
    SELECT COALESCE(SUM(messages_sent), 0) INTO current_usage
    FROM usage_metrics
    WHERE org_id = target_org_id 
      AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE);
  ELSIF limit_type = 'ai_queries' THEN
    SELECT ai_query_limit INTO max_limit FROM plans WHERE id = org_plan;
    SELECT COALESCE(SUM(ai_queries), 0) INTO current_usage
    FROM usage_metrics
    WHERE org_id = target_org_id 
      AND date_trunc('month', date) = date_trunc('month', CURRENT_DATE);
  ELSIF limit_type = 'contacts' THEN
    SELECT contact_limit INTO max_limit FROM plans WHERE id = org_plan;
    -- For contacts we check current total
    SELECT COUNT(*) INTO current_usage FROM contacts WHERE org_id = target_org_id;
  ELSE
    RETURN FALSE; -- Unknown limit type
  END IF;

  RETURN current_usage < max_limit;
END;
$$;
