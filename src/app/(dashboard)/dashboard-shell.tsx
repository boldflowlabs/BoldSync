"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { OrgProvider, useOrg } from "@/components/org-provider";
import { FloatingDock } from "@/components/layout/floating-dock";

// Auth-gated dashboard shell. Extracted from the layout so the layout
// itself can stay a server component and export metadata (noindex) —
// client components can't export Next's metadata object.

function DashboardShellInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  // No more sidebar drawer state.

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Check for impersonation cookie on the client side
  const [impersonatedOrgName, setImpersonatedOrgName] = useState<string | null>(null);
  
  useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )boldsync_is_impersonating=([^;]+)'));
    if (match) {
      setImpersonatedOrgName(decodeURIComponent(match[2]));
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading orgs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {impersonatedOrgName && (
        <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-4 sticky top-0 z-[60]">
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            ⚠️ Viewing as: <strong className="font-bold">{impersonatedOrgName}</strong>
          </span>
          <form action="/api/admin/impersonate/exit" method="POST">
            <button type="submit" className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded transition-colors font-semibold">
              Exit impersonation
            </button>
          </form>
        </div>
      )}

      {/* Floating Navigation Dock */}
      <FloatingDock />

      {/* Main Centered Narrative View */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 pt-28 pb-12 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <OrgProvider>
        <DashboardShellInner>{children}</DashboardShellInner>
      </OrgProvider>
    </AuthProvider>
  );
}
