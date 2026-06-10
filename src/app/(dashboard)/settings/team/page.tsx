import { Metadata } from "next";
import { TeamSettings } from "@/components/settings/team/team-settings";

export const metadata: Metadata = {
  title: "Team Settings | BoldSync",
  description: "Manage your team and org members.",
};

export default function TeamSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground mt-2">
          Invite teammates to your org so they can access the shared inbox and contacts.
        </p>
      </div>

      <TeamSettings />
    </div>
  );
}
