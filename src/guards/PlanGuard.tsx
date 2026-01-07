/**
 * Plan Guard Component
 * 
 * Restricts access based on plan limits or features.
 */

import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanGuardProps {
  children: ReactNode;
  requireFeature?: string;
  requirePlan?: string[];
  fallback?: ReactNode;
}

export function PlanGuard({ 
  children, 
  requireFeature,
  requirePlan,
  fallback 
}: PlanGuardProps) {
  const { plan, company, limits, usage } = useAuth();

  // Check plan requirement
  if (requirePlan && plan) {
    const hasPlan = requirePlan.includes(plan.name);
    if (!hasPlan) {
      return fallback || (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upgrade Required</AlertTitle>
          <AlertDescription>
            This feature requires {requirePlan.join(" or ")} plan.
            <Button variant="link" className="p-0 ml-2 h-auto">
              Upgrade now
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
  }

  // Check feature requirement
  if (requireFeature && plan?.features) {
    const hasFeature = plan.features[requireFeature] === true;
    if (!hasFeature) {
      return fallback || (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertTitle>Feature Not Available</AlertTitle>
          <AlertDescription>
            This feature is not available in your current plan.
          </AlertDescription>
        </Alert>
      );
    }
  }

  // Check limits
  if (limits && usage) {
    // Example: Check if instance limit reached
    if (limits.instances !== null && usage.instances >= limits.instances) {
      return fallback || (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limit Reached</AlertTitle>
          <AlertDescription>
            You've reached your plan limit for instances ({limits.instances}).
            Please upgrade to add more.
          </AlertDescription>
        </Alert>
      );
    }
  }

  return <>{children}</>;
}

