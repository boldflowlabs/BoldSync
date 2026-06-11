import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default async function AdminOrgTeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adminClient = createAdminClient();

  const { data: members } = await adminClient
    .from('org_members')
    .select(`
      role,
      user:profiles(full_name, email)
    `)
    .eq('org_id', id);

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{member.user?.full_name || 'N/A'}</TableCell>
                  <TableCell>{member.user?.email || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{member.role}</TableCell>
                  <TableCell className="text-right">
                    {/* Add remove member action later */}
                    <span className="text-xs text-muted-foreground">Manage</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
