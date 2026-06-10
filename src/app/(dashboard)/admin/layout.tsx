import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldAlert, Users, Building2, Activity } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        {/* Admin Sidebar */}
        <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
          <div className="p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-500">
              <ShieldAlert className="h-5 w-5" />
              Super Admin
            </h2>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Activity className="h-4 w-4" />
              Overview
            </Link>
            <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Users className="h-4 w-4" />
              All Users
            </Link>
            <Link href="/admin/orgs" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Building2 className="h-4 w-4" />
              Organizations
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-12">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
