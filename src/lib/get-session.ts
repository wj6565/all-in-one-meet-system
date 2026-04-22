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

      return {
        user: {
          id: (token.id || token.sub) as string,
          userId: (token.userId || token.sub) as string,
          email: token.email as string,
          name: token.name as string,
          userType: (token.userType || 'user') as string,
        },
      }
    }

    return null
  } catch {
    return null
  }
}
