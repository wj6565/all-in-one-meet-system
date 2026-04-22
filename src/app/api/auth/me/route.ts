import { NextResponse } from 'next/server'
import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const secret = process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026'

    // HTTPS 환경이면 __Secure- prefix 쿠키, 아니면 일반 쿠키
    const secureCookie = cookieStore.get('__Secure-authjs.session-token')
    const regularCookie = cookieStore.get('authjs.session-token')
    const sessionCookie = secureCookie || regularCookie

    if (!sessionCookie) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    const cookieName = secureCookie ? '__Secure-authjs.session-token' : 'authjs.session-token'

    const token = await decode({
      token: sessionCookie.value,
      secret,
      salt: cookieName,
    })

    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: token.id || token.sub,
        userId: token.userId || token.sub,
        email: token.email,
        name: token.name,
        userType: token.userType || 'user',
      }
    })
  } catch (e) {
    console.error('Auth/me error:', e)
    return NextResponse.json({ user: null }, { status: 401 })
  }
}
