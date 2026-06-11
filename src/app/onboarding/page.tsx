"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/components/org-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Building2, Loader2, Sparkles, Briefcase, Users } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { orgs, activeOrganizationId, refreshOrgs } = useOrg();
  
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill the name
  useEffect(() => {
    if (orgs.length > 0 && activeOrganizationId) {
      const org = orgs.find((o) => o.id === activeOrganizationId);
      if (org) {
        setName(org.name || "");
      }
    }
  }, [orgs, activeOrganizationId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganizationId) return;
    
    if (!name || !industry || !companySize) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: activeOrganizationId, name, industry, companySize })
      });

      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Failed to save details");
        setSaving(false);
      } else {
        toast.success("Welcome aboard!");
        await refreshOrgs();
        // Redirect to dashboard (which will then show paywall if they are an owner without a plan)
        router.push("/dashboard");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10 animate-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-inner ring-1 ring-primary/20 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome to BoldSync</h1>
          <p className="text-muted-foreground">Let's set up your workspace so you can get started.</p>
        </div>

        <div className="glass rounded-2xl border border-border/50 p-8 shadow-xl animate-in slide-in-from-bottom-8 duration-700">
          <form onSubmit={handleSave} className="space-y-6">
            
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Organization Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-11 bg-background/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Industry
              </Label>
              <Select value={industry} onValueChange={(v) => setIndustry(v || "")} required>
                <SelectTrigger className="h-11 bg-background/50">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ecommerce">E-Commerce & Retail</SelectItem>
                  <SelectItem value="saas">Software & SaaS</SelectItem>
                  <SelectItem value="agency">Agency & Consulting</SelectItem>
                  <SelectItem value="realestate">Real Estate</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size" className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Company Size
              </Label>
              <Select value={companySize} onValueChange={(v) => setCompanySize(v || "")} required>
                <SelectTrigger className="h-11 bg-background/50">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Just me (1)</SelectItem>
                  <SelectItem value="2-10">2 - 10 employees</SelectItem>
                  <SelectItem value="11-50">11 - 50 employees</SelectItem>
                  <SelectItem value="51-200">51 - 200 employees</SelectItem>
                  <SelectItem value="201+">201+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full h-11 text-base mt-4" disabled={saving || !activeOrganizationId}>
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Complete Setup"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
