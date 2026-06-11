import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { SidebarProvider, SidebarTrigger, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { LayoutDashboard, Users, MessageSquare, CreditCard, Bot, Activity, Settings, Home } from 'lucide-react';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const adminClient = createAdminClient();
  const cookieStore = await cookies();
  const impersonatedOrgId = cookieStore.get('boldsync_impersonation')?.value;
  let impersonatedOrgName = null;

  if (impersonatedOrgId) {
    const { data } = await adminClient
      .from('organizations')
      .select('name')
      .eq('id', impersonatedOrgId)
      .single();
    impersonatedOrgName = data?.name;
  }

  // Fetch sidebar badges
  const { count: activeClientsCount } = await adminClient.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: haltedSubscriptions } = await adminClient.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'halted');
  const { count: disconnectedWabas } = await adminClient.from('waba_accounts').select('*', { count: 'exact', head: true }).eq('status', 'disconnected');

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
                    <span className="flex-1">Clients</span>
                    {activeClientsCount !== null && activeClientsCount > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeClientsCount}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/waba" />}>
                    <MessageSquare className="w-4 h-4" />
                    <span className="flex-1">WABA</span>
                    {disconnectedWabas !== null && disconnectedWabas > 0 && (
                      <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded-full">{disconnectedWabas}</span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link href="/admin/billing" />}>
                    <CreditCard className="w-4 h-4" />
                    <span className="flex-1">Billing</span>
                    {haltedSubscriptions !== null && haltedSubscriptions > 0 && (
                      <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-1.5 py-0.5 rounded-full">{haltedSubscriptions}</span>
                    )}
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
        <header className={`sticky ${impersonatedOrgName ? 'top-[36px]' : 'top-0'} z-50 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 shadow-sm`}>
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
