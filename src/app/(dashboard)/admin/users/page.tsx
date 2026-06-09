import { createAdminClient } from '@/lib/supabase/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

export default async function AdminUsersPage() {
  const adminClient = createAdminClient();

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">All Users</h1>
        <p className="text-muted-foreground">Every user registered on the platform.</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.map((profile) => {
              const initial = (profile.full_name || profile.email || 'U').charAt(0).toUpperCase();
              
              return (
                <TableRow key={profile.id}>
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ''} />
                      <AvatarFallback>{initial}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{profile.full_name || 'No Name'}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      profile.role === 'super_admin' 
                        ? 'bg-amber-500/10 text-amber-500' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {profile.role || 'user'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {profile.created_at ? format(new Date(profile.created_at), 'MMM d, yyyy') : 'Unknown'}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {(!profiles || profiles.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
