import { createAdminClient } from '@/lib/supabase/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

export default async function AdminWorkspacesPage() {
  const adminClient = createAdminClient();

  const { data: workspaces } = await adminClient
    .from('workspaces')
    .select(`
      *,
      owner:profiles!workspaces_owner_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">All Workspaces</h1>
        <p className="text-muted-foreground">Every workspace registered on the platform.</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Workspace Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {workspaces?.map((workspace) => (
              <TableRow key={workspace.id}>
                <TableCell className="font-medium">{workspace.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{workspace.owner?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{workspace.owner?.email || ''}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {workspace.created_at ? format(new Date(workspace.created_at), 'MMM d, yyyy') : 'Unknown'}
                </TableCell>
              </TableRow>
            ))}
            
            {(!workspaces || workspaces.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No workspaces found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
