/**
 * 서버사이드에서 커스텀 JWT 세션을 읽는 헬퍼
 * NextAuth auth() 대신 이 함수를 사용합니다.
 */
import { decode } from 'next-auth/jwt'
import { cookies } from 'next/headers'

export interface SessionUser {
  id: string
  userId: string
  email: string
  name: string
  userType: string
}

export interface Session {
  user: SessionUser
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const secret = process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026'

    const secureCookie = cookieStore.get('__Secure-authjs.session-token')
    const regularCookie = cookieStore.get('authjs.session-token')
    const sessionCookie = secureCookie || regularCookie

    if (!sessionCookie) return null

    const cookieName = secureCookie
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token'

    const token = await decode({
      token: sessionCookie.value,
      secret,
      salt: cookieName,
    })

    if (!token) return null

    return {
      user: {
        id: (token.id || token.sub) as string,
        userId: (token.userId || token.sub) as string,
        email: token.email as string,
        name: token.name as string,
        userType: (token.userType || 'user') as string,
      },
    }
  } catch {
    return null
  }
}
