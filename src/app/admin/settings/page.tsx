import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle } from 'lucide-react';

export default async function AdminGlobalSettingsPage() {
  const adminClient = createAdminClient();

  // Fetch all users with is_super_admin = true
  const { data: superAdmins } = await adminClient
    .from('profiles')
    .select('*')
    .eq('is_super_admin', true);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Platform Settings</h1>
        <p className="text-muted-foreground">Global configuration, security, and super-admin access control.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Configuration</CardTitle>
            <CardDescription>Manage environment variables that control platform behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">N8N_AI_WEBHOOK_URL</h3>
              <div className="text-xs font-mono bg-muted p-2 rounded-md break-all">
                {process.env.N8N_AI_WEBHOOK_URL || 'Not configured in Vercel/Hostinger environment variables.'}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">INTERNAL_WEBHOOK_SECRET</h3>
              <div className="text-xs font-mono bg-muted p-2 rounded-md break-all">
                {process.env.INTERNAL_WEBHOOK_SECRET ? '••••••••••••••••' : 'Not configured. Webhook security disabled.'}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">META_APP_SECRET</h3>
              <div className="text-xs font-mono bg-muted p-2 rounded-md break-all">
                {process.env.META_APP_SECRET ? '••••••••••••••••' : 'Not configured.'}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              * Note: Environment variables must be updated directly in your hosting provider (Vercel/Hostinger) or local `.env` file and require a server restart.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              Super Admins
            </CardTitle>
            <CardDescription>Users who have full access to this `/admin` panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAdmins?.map((admin: any) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.full_name || 'N/A'}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive">Revoke</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full">Grant Super Admin Access</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Destructive actions that cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background">
            <div>
              <h3 className="font-medium">Export Platform Data</h3>
              <p className="text-sm text-muted-foreground">Download a complete JSON dump of all organizations, users, and logs.</p>
            </div>
            <Button variant="outline">Export Data</Button>
          </div>

          <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-background">
            <div>
              <h3 className="font-medium">Purge Client Organization</h3>
              <p className="text-sm text-muted-foreground">Completely delete an organization and all its associated data from the database.</p>
            </div>
            <Button variant="destructive">Purge Organization...</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
