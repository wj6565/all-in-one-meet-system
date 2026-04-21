import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SECRET = process.env.NEXTAUTH_SECRET || 'meeting-system-secret-key-change-in-production'

async function getSessionToken(req: NextRequest) {
  const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.url.startsWith('https')
  const cookieNames = isHttps
    ? ['__Secure-authjs.session-token', 'authjs.session-token']
    : ['authjs.session-token', '__Secure-authjs.session-token']

  for (const cookieName of cookieNames) {
    const token = await getToken({ req, secret: SECRET, cookieName })
    if (token) return token
  }
  return null
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 공개 경로 ──────────────────────────────────────
  if (pathname === '/login' || pathname === '/admin/login') {
    return NextResponse.next()
  }

  // ── /admin/** 보호 (관리자만) ──────────────────────
  if (pathname.startsWith('/admin')) {
    const token = await getSessionToken(req)
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    // 일반 사용자가 관리자 페이지 접근 시 /home으로
    if (token.userType === 'user') {
      return NextResponse.redirect(new URL('/home', req.url))
    }
    return NextResponse.next()
  }

  // ── /home 보호 (로그인 필요) ──────────────────────
  if (pathname.startsWith('/home')) {
    const token = await getSessionToken(req)
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  }

  // ── / (메인) - 로그인 상태면 역할에 따라 분기 ──────
  if (pathname === '/') {
    const token = await getSessionToken(req)
    if (token) {
      if (token.userType === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      } else {
        return NextResponse.redirect(new URL('/home', req.url))
      }
    }
    // 비로그인이면 로그인 페이지로
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/home/:path*'],
}
