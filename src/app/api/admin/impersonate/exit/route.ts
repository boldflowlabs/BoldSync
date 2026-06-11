import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete('boldsync_impersonation');
  
  // Redirect back to the admin dashboard
  return NextResponse.redirect(new URL('/admin/dashboard', request.url));
}
