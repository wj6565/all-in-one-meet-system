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
    
    // HTTPS 여부 판단 (host 기반)
    const host = req.headers.get('host') || ''
    const isSecure = !host.includes('localhost')
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token'

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

    // NextAuth v5 JWT 토큰 생성 (salt 필수)
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
      secure: isSecure,
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
