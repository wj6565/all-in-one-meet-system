import { NextRequest, NextResponse } from 'next/server'

const SECRET = process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026'

// next-auth/jwt decode 대신 직접 쿠키 값 존재 여부만 확인
// (실제 검증은 각 API route의 getSession()에서 수행)
async function getSessionToken(req: NextRequest) {
  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
  ]
  for (const cookieName of cookieNames) {
    const val = req.cookies.get(cookieName)?.value
    if (val && val.length > 10) return { exists: true, cookieName }
  }
  return null
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 공개 경로
  if (pathname === '/login' || pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/static/')) {
    return NextResponse.next()
  }

  // 보호 경로
  if (
    pathname.startsWith('/booking') ||
    pathname.startsWith('/home') ||
    pathname.startsWith('/meeting') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/tablet')
  ) {
    const token = await getSessionToken(req)
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // 루트
  if (pathname === '/') {
    const token = await getSessionToken(req)
    if (token) return NextResponse.redirect(new URL('/home', req.url))
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/home/:path*', '/booking/:path*', '/admin/:path*', '/meeting/:path*', '/tablet/:path*'],
}
