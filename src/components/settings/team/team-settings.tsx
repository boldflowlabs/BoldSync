"use client";

import { useState, useEffect } from "react";
import { useOrg } from "@/components/org-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Building2, UserPlus, Shield, User, Crown, Users, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

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
  const { activeOrganizationId } = useOrg();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!activeOrganizationId) return;
    loadMembers();
  }, [activeOrganizationId]);

  async function loadMembers() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: membersData, error: membersErr } = await supabase
      .from("org_members")
      .select(`id, role, user_id, created_at`)
      .eq("org_id", activeOrganizationId)
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

    if (session?.user) {
      const current = merged.find(m => m.user_id === session.user.id);
      if (current) setCurrentUserRole(current.role);
    }

    setMembers(merged as any);
    setLoading(false);
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), orgId: activeOrganizationId })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.info(data.error);
        } else {
          toast.error(data.error);
        }
      } else {
        toast.success(data.message || "Teammate added successfully!");
        setInviteEmail("");
        loadMembers();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!activeOrganizationId) return;

    setRemovingId(memberId);
    try {
      const res = await fetch('/api/team/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, orgId: activeOrganizationId })
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
      } else {
        toast.success("Teammate removed successfully!");
        loadMembers();
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setRemovingId(null);
      setMemberToRemove(null);
    }
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
            disabled={inviting || !activeOrganizationId}
            required
            className="bg-background/50"
          />
          <Button type="submit" disabled={inviting || !activeOrganizationId}>
            {inviting ? "Adding..." : "Add to Team"}
          </Button>
        </form>
      </div>

      <div className="glass rounded-xl border border-border/50 shadow-sm overflow-hidden">
        <div className="border-b border-border/50 bg-muted/20 px-6 py-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Organization Members
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
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-sm font-medium border border-border/50">
                    {getRoleIcon(member.role)}
                    <span className="capitalize">{member.role}</span>
                  </div>
                  {currentUserRole === 'owner' && member.role !== 'owner' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setMemberToRemove(member)}
                      disabled={removingId === member.id}
                      title="Remove member"
                    >
                      {removingId === member.id ? (
                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Teammate</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-foreground">{memberToRemove?.profiles?.full_name}</span> from the organization? They will lose access to all data and resources immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMemberToRemove(null)} disabled={removingId !== null}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleRemove(memberToRemove!.id)} disabled={removingId !== null}>
              {removingId !== null ? "Removing..." : "Remove Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
