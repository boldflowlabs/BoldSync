"use client";

import { useOrg } from "@/components/org-provider";
import { hasAccessToFeature, PlanTier } from "@/lib/plan-limits";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";

interface PlanGateProps {
  requiredPlan: PlanTier;
  children: React.ReactNode;
  featureName?: string;
}

export function PlanGate({ requiredPlan, children, featureName = "This feature" }: PlanGateProps) {
  const { activeOrganizationId, orgs } = useOrg();
  const activeOrg = orgs.find(o => o.id === activeOrganizationId);

  // If no org yet, just return null (loading state handled globally)
  if (!activeOrg) return null;

  const hasAccess = hasAccessToFeature(activeOrg.plan, requiredPlan);

  // Super admin bypass or has access
  if (hasAccess || activeOrg.currentUserRole === 'superadmin') {
    return <>{children}</>;
  }

  // Upgrade prompt
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-6">
        <Lock className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">
        Upgrade Required
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto mb-8">
        {featureName} requires the <span className="font-medium text-foreground capitalize">{requiredPlan}</span> plan. 
        Upgrade your organization to unlock this capability and scale your operations.
      </p>
      <Link href="/settings/billing">
        <Button size="lg" className="shadow-none">
          View Plans & Upgrade
        </Button>
      </Link>
    </div>
  );
}
