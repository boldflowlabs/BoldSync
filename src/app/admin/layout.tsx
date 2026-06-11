import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, Users, MessageSquare, CreditCard, Bot, Activity, Settings, Home } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  // Guard: Ensure user is super admin
  if (session.user.email !== 'godsonsaji0@gmail.com') {
    // If they aren't a super admin, kick them back to the client dashboard
    redirect('/dashboard');
  }

  return (
    <SidebarProvider>
      <Sidebar variant="inset" className="border-r border-border bg-sidebar">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Agency Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/dashboard" />}>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/clients" />}>
                    <Users className="w-4 h-4" />
                    <span>Clients</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/waba" />}>
                    <MessageSquare className="w-4 h-4" />
                    <span>WABA</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/billing" />}>
                    <CreditCard className="w-4 h-4" />
                    <span>Billing</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/n8n" />}>
                    <Bot className="w-4 h-4" />
                    <span>n8n Services</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/logs" />}>
                    <Activity className="w-4 h-4" />
                    <span>Logs</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/settings" />}>
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <div className="my-4 border-t border-border" />

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/dashboard" />}>
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Client Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main className="flex-1 w-full flex flex-col min-h-screen bg-background text-foreground relative">
        <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
