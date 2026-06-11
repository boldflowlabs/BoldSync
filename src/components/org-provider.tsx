"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Organization } from "@/types";
import { SuspendedModal } from "./billing/suspended-modal";

export type OrgWithRole = Organization & { currentUserRole?: string; onboarding_completed?: boolean };

interface OrgContextType {
  orgs: OrgWithRole[];
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string) => void;
  isLoading: boolean;
  refreshOrgs: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrganizations] = useState<OrgWithRole[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

  const loadOrganizations = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    setUserEmail(session.user.email ?? null);

    const { data, error } = await supabase
      .from('org_members')
      .select('role, organizations(*)')
      .eq('user_id', session.user.id);

    if (error) {
      console.error("Failed to load orgs:", error);
    } else if (data) {
      const loadedOrganizations = data.map((d: any) => ({
        ...d.organizations,
        currentUserRole: d.role
      })) as OrgWithRole[];
      
      setOrganizations(loadedOrganizations);
      
      if (loadedOrganizations.length > 0) {
        let activeId = localStorage.getItem("boldsync_org_id");
        if (!activeId || !loadedOrganizations.find((w) => w.id === activeId)) {
          activeId = loadedOrganizations[0].id;
        }
        
        setActiveOrganizationIdState(activeId);
        localStorage.setItem("boldsync_org_id", activeId);
        document.cookie = `boldsync_org_id=${activeId}; path=/; max-age=31536000`;
      }
    }
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const setActiveOrganizationId = (id: string) => {
    setActiveOrganizationIdState(id);
    localStorage.setItem("boldsync_org_id", id);
    document.cookie = `boldsync_org_id=${id}; path=/; max-age=31536000`;
  };

  const activeOrg = orgs.find(o => o.id === activeOrganizationId);

  // Interception Logic
  useEffect(() => {
    if (isLoading || !activeOrg) return;

    // 1. Onboarding Check
    if (activeOrg.onboarding_completed === false) {
      if (pathname !== '/onboarding') {
        router.push('/onboarding');
      }
    } else {
      // 2. If onboarding is complete, ensure they are NOT on the onboarding page
      if (pathname === '/onboarding') {
        router.push('/dashboard');
      }
    }
  }, [activeOrg, isLoading, pathname, router]);

  // Render Logic
  const isSuperAdmin = userEmail === 'godsonsaji0@gmail.com';
  const showPaywall = !isSuperAdmin &&
                      activeOrg?.onboarding_completed !== false && 
                      ((activeOrg as any)?.status === 'suspended' || (activeOrg as any)?.status === 'inactive') &&
                      pathname !== '/onboarding';

  return (
    <OrgContext.Provider value={{ orgs, activeOrganizationId, setActiveOrganizationId, isLoading, refreshOrgs: loadOrganizations }}>
      {showPaywall ? <SuspendedModal /> : children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}
