import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const room = await prisma.room.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code || null,
        location: body.location || null,
        description: body.description || null,
        capacity: body.capacity || 10,
        isActive: body.isActive !== false,
        isTabletMode: body.isTabletMode || false,
      }
    })
    return NextResponse.json(room)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { id } = await params
    await prisma.room.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
