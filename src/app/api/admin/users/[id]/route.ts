import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
import bcrypt from 'bcryptjs'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { id } = await params
    const body = await req.json()
    const { name, email, loginId, loginPassword, position, departmentName, role, isActive } = body

    // 부서 처리
    let departmentId: string | null = null
    if (departmentName) {
      const dept = await prisma.department.upsert({
        where: { name: departmentName },
        create: { name: departmentName },
        update: {},
      })
      departmentId = dept.id
    }

    const updateData: Record<string, unknown> = {
      name,
      email,
      position: position || null,
      departmentId,
      userType: role || 'user',
      isActive: isActive !== false,
    }
    if (loginId !== undefined) updateData.loginId = loginId || null
    if (loginPassword) updateData.loginPassword = await bcrypt.hash(loginPassword, 10)

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { department: { select: { id: true, name: true } } },
    })
    return NextResponse.json(user)
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

    // 회의 이력이 있으면 비활성화, 없으면 삭제
    const meetingCount = await prisma.meetingAttendee.count({ where: { userId: id } })
    if (meetingCount > 0) {
      await prisma.user.update({ where: { id }, data: { isActive: false } })
      return NextResponse.json({ success: true, action: 'deactivated' })
    }
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ success: true, action: 'deleted' })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
