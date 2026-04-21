import { NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET || 'integrated-meet-system-secret-2026',
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.userId = (user as { userId?: string }).userId || user.id
        token.email = user.email
        token.name = user.name
        token.userType = (user as { userType?: string }).userType || 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { userId?: string }).userId = token.userId as string
        ;(session.user as { userType?: string }).userType = token.userType as string
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        loginId: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.loginId || !credentials?.password) return null

        const { prisma } = await import('./prisma')
        const bcrypt = await import('bcryptjs')

        const loginId = String(credentials.loginId)
        const password = String(credentials.password)

        // 1. 관리자 계정 (Account 테이블) - email로 로그인
        const account = await prisma.account.findUnique({ where: { email: loginId } })
        if (account && account.isActive) {
          const match = await bcrypt.default.compare(password, account.password)
          if (match) {
            return {
              id: account.id,
              userId: account.id,
              email: account.email,
              name: account.name,
              userType: 'admin',
            } as { id: string; userId: string; email: string; name: string; userType: string }
          }
        }

        // 2. 일반 사용자 / 태블릿 (User 테이블) - loginId로 로그인
        const user = await prisma.user.findUnique({ where: { loginId }, include: { department: true } })
        if (user && user.isActive && user.loginPassword) {
          const match = await bcrypt.default.compare(password, user.loginPassword)
          if (match) {
            return {
              id: user.id,
              userId: user.id,
              email: user.email,
              name: user.name,
              userType: user.userType, // 'user' | 'tablet' | 'admin'
            } as { id: string; userId: string; email: string; name: string; userType: string }
          }
        }

        return null
      }
    })
  ],
}

// authOptions alias for getServerSession
export const authOptions = authConfig
