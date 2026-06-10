export type PlanTier = 'none' | 'starter' | 'growth' | 'scale' | 'demo';

const PLAN_WEIGHTS: Record<PlanTier, number> = {
  none: 0,
  starter: 1,
  growth: 2,
  scale: 3,
  demo: 99, // Demo plan gets all features
};

/**
 * Check if the user's current plan meets or exceeds the required plan.
 */
export function hasAccessToFeature(currentPlan: string | undefined | null, requiredPlan: PlanTier): boolean {
  if (!currentPlan) return false;
  
  const currentWeight = PLAN_WEIGHTS[currentPlan as PlanTier] ?? 0;
  const requiredWeight = PLAN_WEIGHTS[requiredPlan];

  return currentWeight >= requiredWeight;
}
