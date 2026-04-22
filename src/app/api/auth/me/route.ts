import { NextResponse } from 'next/server'
import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const secret = process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026'

    // HTTPS(__Secure- prefix)와 HTTP(일반) 두 가지 쿠키 이름 모두 시도
    const cookieNames = [
      '__Secure-authjs.session-token',
      'authjs.session-token',
    ]

    for (const cookieName of cookieNames) {
      const sessionCookie = cookieStore.get(cookieName)
      if (!sessionCookie) continue

      const token = await decode({
        token: sessionCookie.value,
        secret,
        salt: cookieName,
      })

      if (!token) continue

      return NextResponse.json({
        user: {
          id: token.id || token.sub,
          userId: token.userId || token.sub,
          email: token.email,
          name: token.name,
          userType: token.userType || 'user',
        }
      })
    }

    return NextResponse.json({ user: null }, { status: 401 })
  } catch (e) {
    console.error('Auth/me error:', e)
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
