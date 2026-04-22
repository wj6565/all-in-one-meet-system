import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'

export async function POST(req: Request) {
  try {
    const { loginId, password } = await req.json()
    if (!loginId || !password) {
      return NextResponse.json({ error: '아이디와 비밀번호를 입력하세요.' }, { status: 400 })
    }

    const secret = process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026'

    // HTTPS 감지:
    // 1. x-forwarded-proto 헤더 (일부 프록시에서 전달)
    // 2. 요청 URL scheme
    // 3. 호스트명이 localhost/127.0.0.1이 아니면 HTTPS 환경으로 간주
    const proto = (req.headers as Headers).get('x-forwarded-proto') || ''
    const host = (req.headers as Headers).get('host') || ''
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')
    const isHttps = proto === 'https' || req.url.startsWith('https') || !isLocalhost

    // HTTPS 환경: __Secure- prefix + Secure 플래그 (브라우저 정책 준수)
    // HTTP 환경(localhost): 일반 쿠키 이름
    const cookieName = isHttps
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'

    let tokenPayload: Record<string, unknown> | null = null

    // 1. 관리자 계정 (Account 테이블) - email 또는 id로 로그인
    const account = await prisma.account.findFirst({
      where: { OR: [{ email: loginId }, { id: loginId }] }
    })
    if (account && account.isActive) {
      const match = await bcrypt.compare(password, account.password)
      if (match) {
        tokenPayload = {
          id: account.id,
          userId: account.id,
          email: account.email,
          name: account.name,
          userType: 'admin',
          sub: account.id,
        }
      }
    }

    // 2. 일반 사용자 / 태블릿 (User 테이블)
    if (!tokenPayload) {
      const user = await prisma.user.findUnique({ where: { loginId } })
      if (user && user.isActive && user.loginPassword) {
        const match = await bcrypt.compare(password, user.loginPassword)
        if (match) {
          tokenPayload = {
            id: user.id,
            userId: user.id,
            email: user.email,
            name: user.name,
            userType: user.userType,
            sub: user.id,
          }
        }
      }
    }

    if (!tokenPayload) {
      return NextResponse.json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, { status: 401 })
    }

    const sessionToken = await encode({
      token: tokenPayload,
      secret,
      salt: cookieName,
      maxAge: 30 * 24 * 60 * 60,
    })

    const userType = tokenPayload.userType as string
    const redirectUrl = userType === 'tablet' ? '/tablet' : '/home'

    const response = NextResponse.json({ ok: true, userType, redirect: redirectUrl })

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isHttps,    // HTTPS면 true (브라우저가 쿠키 저장 허용)
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })

    return response
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
