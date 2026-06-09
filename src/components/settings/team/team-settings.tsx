"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/components/workspace-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Building2, UserPlus, Shield, User, Crown, Users } from "lucide-react";

interface Member {
  id: string;
  role: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  }
}

export function TeamSettings() {
  const { activeWorkspaceId } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!activeWorkspaceId) return;
    loadMembers();
  }, [activeWorkspaceId]);

  async function loadMembers() {
    setLoading(true);
    const { data: membersData, error: membersErr } = await supabase
      .from("workspace_members")
      .select(`id, role, user_id, created_at`)
      .eq("workspace_id", activeWorkspaceId)
      .order("created_at", { ascending: true });

    if (membersErr || !membersData) {
      console.error(membersErr);
      toast.error("Failed to load team members");
      setLoading(false);
      return;
    }

    const userIds = membersData.map(m => m.user_id);
    
    let profilesData: any[] = [];
    if (userIds.length > 0) {
      const { data: pData } = await supabase
        .from("profiles")
        .select(`user_id, full_name, email, avatar_url`)
        .in("user_id", userIds);
      profilesData = pData || [];
    }

    const merged = membersData.map(m => ({
      ...m,
      profiles: profilesData.find(p => p.user_id === m.user_id) || null
    }));

    setMembers(merged as any);
    setLoading(false);
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    
    // For MVP, since we don't have a backend invitation email system set up yet,
    // we will lookup the user by email in profiles. If they exist, we add them to the workspace.
    // If they don't, we show an error telling the user they must sign up first.
    
    const { data: profiles, error: profileErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", inviteEmail.trim())
      .limit(1);

    if (profileErr || !profiles || profiles.length === 0) {
      toast.error(`No BoldSync account found for ${inviteEmail}. They must create an account first.`);
      setInviting(false);
      return;
    }

    const userIdToInvite = profiles[0].user_id;

    // Check if already in workspace
    const { data: existing, error: existErr } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", activeWorkspaceId)
      .eq("user_id", userIdToInvite);

    if (existing && existing.length > 0) {
      toast.info("User is already in this workspace");
      setInviting(false);
      return;
    }

    const { error: insertErr } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: activeWorkspaceId,
        user_id: userIdToInvite,
        role: 'member'
      });

    if (insertErr) {
      console.error(insertErr);
      toast.error("Failed to add user to workspace");
    } else {
      toast.success("Teammate added successfully!");
      setInviteEmail("");
      loadMembers();
    }

    setInviting(false);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-4 w-4 text-amber-500" />;
      case "admin": return <Shield className="h-4 w-4 text-blue-500" />;
      default: return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl border border-border/50 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Building2 className="w-32 h-32" />
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Invite Member</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-xl">
          Enter the email address of the teammate you want to add. Note: For this beta, they must have already signed up for a BoldSync account using this email.
        </p>
        
        <form onSubmit={handleInvite} className="flex gap-3 max-w-md relative z-10">
          <Input 
            type="email" 
            placeholder="colleague@company.com" 
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            disabled={inviting || !activeWorkspaceId}
            required
            className="bg-background/50"
          />
          <Button type="submit" disabled={inviting || !activeWorkspaceId}>
            {inviting ? "Adding..." : "Add to Team"}
          </Button>
        </form>
      </div>

      <div className="glass rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="border-b border-border/50 bg-muted/20 px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Workspace Members
          </h2>
        </div>
        
        <div className="divide-y divide-border/50">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No members found.</div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 sm:px-6 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar>
                    {member.profiles?.avatar_url && <AvatarImage src={member.profiles.avatar_url} />}
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.profiles?.full_name?.charAt(0) || member.profiles?.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.profiles?.full_name || "Unknown User"}
                      {member.id === "pending" && <span className="text-[10px] uppercase bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">Pending</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.profiles?.email}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm font-medium border border-border/50">
                  {getRoleIcon(member.role)}
                  <span className="capitalize">{member.role}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
