import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Disable public signup - redirect to login with message
  if (request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/register') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('message', 'contact-agency')
    return NextResponse.redirect(url)
  }

  // Auth pages - redirect to dashboard if already logged in
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Protected pages - redirect to login if not authenticated
  const protectedPaths = ['/dashboard', '/inbox', '/contacts', '/pipelines', '/broadcasts', '/automations', '/settings', '/admin']
  if (!user && protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  // Admin pages - check if user is the super admin email
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    if (user.email !== 'godsonsaji0@gmail.com') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // API routes that need auth (not webhooks)
  if (!user && request.nextUrl.pathname.startsWith('/api/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Enforce usage limits before write operations
  if (user && request.method === 'POST') {
    const orgId = user.user_metadata?.org_id || user.app_metadata?.org_id || request.headers.get('x-org-id');
    
    // We only enforce limits if we can identify the org (which we should for these routes)
    if (orgId) {
      if (request.nextUrl.pathname.startsWith('/api/whatsapp/send') || 
          request.nextUrl.pathname.startsWith('/api/whatsapp/broadcast')) {
        const { data: hasLimit } = await supabase.rpc('check_usage_limit', { target_org_id: orgId, limit_type: 'messages' });
        if (hasLimit === false) {
          return NextResponse.json({ error: 'Message limit reached for your plan' }, { status: 403 });
        }
      }
      
      if (request.nextUrl.pathname.startsWith('/api/ai/')) {
        const { data: hasLimit } = await supabase.rpc('check_usage_limit', { target_org_id: orgId, limit_type: 'ai_queries' });
        if (hasLimit === false) {
          return NextResponse.json({ error: 'AI query limit reached for your plan' }, { status: 403 });
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
