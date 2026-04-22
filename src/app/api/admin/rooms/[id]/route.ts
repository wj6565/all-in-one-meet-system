import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const updateData: Record<string, unknown> = {
      name: body.name,
      location: body.location || null,
      description: body.description || null,
      capacity: body.capacity || 10,
      isTabletMode: body.isTabletMode || false,
      tabletPinCode: body.isTabletMode ? (body.tabletPinCode || null) : null,
    }
    if (body.code !== undefined) updateData.code = body.code || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive
    const room = await prisma.room.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { meetings: true } } }
    })
    return NextResponse.json(room)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '수정 실패' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession()
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
