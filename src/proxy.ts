import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SECRET = process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026'

async function getSessionToken(req: NextRequest) {
  // HTTPS(__Secure- prefix)와 HTTP(일반) 두 가지 쿠키 이름 모두 시도
  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
  ]

  for (const cookieName of cookieNames) {
    const token = await getToken({ req, secret: SECRET, cookieName })
    if (token) return token
  }
  return null
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 공개 경로
  if (pathname === '/login' || pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // /booking, /home, /admin, /meeting, /tablet 보호
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
    // 일반 사용자가 관리자 페이지 접근 시 /home으로
    if (pathname.startsWith('/admin') && token.userType === 'user') {
      return NextResponse.redirect(new URL('/home', req.url))
    }
    return NextResponse.next()
  }

  // / (루트) - 로그인 상태면 역할에 따라 분기
  if (pathname === '/') {
    const token = await getSessionToken(req)
    if (token) {
      return NextResponse.redirect(new URL('/home', req.url))
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/home/:path*', '/booking/:path*', '/admin/:path*', '/meeting/:path*', '/tablet/:path*'],
}
