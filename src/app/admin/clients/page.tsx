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
    .from('organizations')
    .select('*')
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
              <TableHead>Plan & Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orgs?.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.name}</TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{org.plan || 'none'}</span>
                  <br/>
                  <span className="text-xs text-muted-foreground capitalize">{org.status || 'active'}</span>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {org.created_at ? format(new Date(org.created_at), 'MMM d, yyyy') : 'Unknown'}
                </TableCell>
                <TableCell className="text-right">
                  <a href={`/admin/clients/${org.id}`} className="text-sm font-medium text-primary hover:underline">
                    Manage Org
                  </a>
                </TableCell>
              </TableRow>
            ))}
            
            {(!orgs || orgs.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
