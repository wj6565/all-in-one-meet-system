import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
export async function GET() {
  try {
    const session = await auth()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const rooms = await prisma.room.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(rooms)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const body = await req.json()
    const room = await prisma.room.create({
      data: {
        name: body.name,
        code: body.code || null,
        location: body.location || null,
        description: body.description || null,
        capacity: body.capacity || 10,
        equipment: body.equipment || null,
      }
    })
    return NextResponse.json(room, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}
