"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { Workspace } from "@/types";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadWorkspaces() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspaces(*)')
        .eq('user_id', session.user.id);

      if (error) {
        console.error("Failed to load workspaces:", error);
      } else if (data) {
        const loadedWorkspaces = data.map((d: any) => d.workspaces) as Workspace[];
        setWorkspaces(loadedWorkspaces);
        
        if (loadedWorkspaces.length > 0) {
          const stored = localStorage.getItem("boldsync_workspace_id");
          if (stored && loadedWorkspaces.find((w) => w.id === stored)) {
            setActiveWorkspaceIdState(stored);
          } else {
            setActiveWorkspaceIdState(loadedWorkspaces[0].id);
            localStorage.setItem("boldsync_workspace_id", loadedWorkspaces[0].id);
          }
        }
      }
      setIsLoading(false);
    }
    loadWorkspaces();
  }, []);

  const setActiveWorkspaceId = (id: string) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem("boldsync_workspace_id", id);
  };

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspaceId, setActiveWorkspaceId, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
