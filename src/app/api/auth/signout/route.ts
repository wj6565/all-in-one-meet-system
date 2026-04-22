import { NextResponse } from 'next/server'

function clearSessionCookies(response: NextResponse) {
  const cookieNames = [
    '__Secure-authjs.session-token',
    'authjs.session-token',
    '__Host-authjs.csrf-token',
    '__Secure-authjs.callback-url',
    'authjs.callback-url',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
  ]
  cookieNames.forEach(name => {
    response.cookies.set(name, '', { maxAge: 0, path: '/' })
  })
  return response
}

export async function POST(req: Request) {
  const host = req.headers.get('host') || ''
  const baseUrl = host.includes('localhost') ? 'http://localhost:3000' : `https://${host}`
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  return clearSessionCookies(response)
}

export async function GET(req: Request) {
  const host = req.headers.get('host') || ''
  const baseUrl = host.includes('localhost') ? 'http://localhost:3000' : `https://${host}`
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  return clearSessionCookies(response)
}
