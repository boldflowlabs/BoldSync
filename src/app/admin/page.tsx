import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  // Redirect root /admin to the dashboard
  redirect('/admin/dashboard');
}
