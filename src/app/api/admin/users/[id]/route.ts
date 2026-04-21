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

    // 현재 사용자 조회 (필드 미전송 시 기존값 유지)
    const existingUser = await prisma.user.findUnique({ where: { id } })
    if (!existingUser) return NextResponse.json({ error: '사용자 없음' }, { status: 404 })

    // 부서 처리
    let departmentId: string | undefined = undefined
    if (departmentName !== undefined) {
      if (departmentName) {
        const dept = await prisma.department.upsert({
          where: { name: departmentName },
          create: { name: departmentName },
          update: {},
        })
        departmentId = dept.id
      } else {
        departmentId = undefined // null로 처리할 경우 별도 로직 필요
      }
    }

    const updateData: Record<string, unknown> = {}
    // 전송된 필드만 업데이트
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (position !== undefined) updateData.position = position || null
    if (departmentId !== undefined) updateData.departmentId = departmentId
    if (role !== undefined) updateData.userType = role  // role만 변경할 때 이름/이메일 불필요
    if (isActive !== undefined) updateData.isActive = isActive
    if (loginId !== undefined) updateData.loginId = loginId || null
    if (loginPassword) updateData.loginPassword = await bcrypt.hash(loginPassword, 10)

    // name/email이 없으면 기존값 유지
    if (!updateData.name) updateData.name = existingUser.name
    if (!updateData.email) updateData.email = existingUser.email

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
