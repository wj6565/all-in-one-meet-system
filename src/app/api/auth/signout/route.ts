import { NextResponse } from 'next/server'

export async function POST() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  // 세션 쿠키 삭제
  response.cookies.delete('__Secure-authjs.session-token')
  response.cookies.delete('authjs.session-token')
  response.cookies.delete('__Host-authjs.csrf-token')
  response.cookies.delete('__Secure-authjs.callback-url')
  return response
}

export async function GET() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const response = NextResponse.redirect(new URL('/login', baseUrl))
  response.cookies.delete('__Secure-authjs.session-token')
  response.cookies.delete('authjs.session-token')
  response.cookies.delete('__Host-authjs.csrf-token')
  response.cookies.delete('__Secure-authjs.callback-url')
  return response
}
