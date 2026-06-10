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

export default async function AdminOrganizationsPage() {
  const adminClient = createAdminClient();

  const { data: orgs } = await adminClient
    .from('orgs')
    .select(`
      *,
      owner:profiles!orgs_owner_id_fkey(full_name, email)
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">All Organizations</h1>
        <p className="text-muted-foreground">Every org registered on the platform.</p>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs?.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{org.owner?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{org.owner?.email || ''}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {org.created_at ? format(new Date(org.created_at), 'MMM d, yyyy') : 'Unknown'}
                </TableCell>
              </TableRow>
            ))}
            
            {(!orgs || orgs.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  No orgs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
