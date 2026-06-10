"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Organization } from "@/types";

interface OrgContextType {
  orgs: Organization[];
  activeOrganizationId: string | null;
  setActiveOrganizationId: (id: string) => void;
  isLoading: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadOrganizations() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('org_members')
        .select('organizations(*)')
        .eq('user_id', session.user.id);

      if (error) {
        console.error("Failed to load orgs:", error);
      } else if (data) {
        const loadedOrganizations = data.map((d: any) => d.organizations) as Organization[];
        setOrganizations(loadedOrganizations);
        
        if (loadedOrganizations.length > 0) {
          const stored = localStorage.getItem("boldsync_org_id");
          if (stored && loadedOrganizations.find((w) => w.id === stored)) {
            setActiveOrganizationIdState(stored);
            document.cookie = `boldsync_org_id=${stored}; path=/; max-age=31536000`;
          } else {
            const firstOrgId = loadedOrganizations[0].id;
            setActiveOrganizationIdState(firstOrgId);
            localStorage.setItem("boldsync_org_id", firstOrgId);
            document.cookie = `boldsync_org_id=${firstOrgId}; path=/; max-age=31536000`;
          }
        }
      }
      setIsLoading(false);
    }
    loadOrganizations();
  }, []);

  const setActiveOrganizationId = (id: string) => {
    setActiveOrganizationIdState(id);
    localStorage.setItem("boldsync_org_id", id);
    document.cookie = `boldsync_org_id=${id}; path=/; max-age=31536000`;
  };

  return (
    <OrgContext.Provider value={{ orgs, activeOrganizationId, setActiveOrganizationId, isLoading }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error("useOrg must be used within a OrgProvider");
  }
  return context;
}
