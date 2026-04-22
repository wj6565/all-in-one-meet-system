import { NextResponse } from 'next/server'

function clearSessionCookies(response: NextResponse) {
  // 모든 가능한 쿠키 이름 삭제 (안전하게 전부)
  const cookieNames = [
    'authjs.session-token',
    '__Secure-authjs.session-token',
    '__Host-authjs.csrf-token',
    '__Secure-authjs.callback-url',
    'authjs.callback-url',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
  ]
  cookieNames.forEach(name => {
    response.cookies.set(name, '', { maxAge: 0, path: '/', httpOnly: true })
  })
  return response
}

export async function POST(req: Request) {
  const host = req.headers.get('host') || ''
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = `${proto}://${host}`
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  return clearSessionCookies(response)
}

export async function GET(req: Request) {
  const host = req.headers.get('host') || ''
  const proto = req.headers.get('x-forwarded-proto') || 'http'
  const baseUrl = `${proto}://${host}`
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  return clearSessionCookies(response)
}
