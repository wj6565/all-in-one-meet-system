import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/get-session'
import bcrypt from 'bcryptjs'

export async function GET(req: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const showAll = searchParams.get('showAll') === 'true'

    const where: Record<string, unknown> = {}
    if (!showAll) where.isActive = true
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { loginId: { contains: search } },
        { department: { name: { contains: search } } },
      ]
    }

    const users = await prisma.user.findMany({
      where,
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    })
    // role 필드 추가 (userType → role로 매핑해서 반환)
    return NextResponse.json(users.map(u => ({ ...u, role: u.userType })))
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const body = await req.json()
    const { name, email, loginId, loginPassword, position, departmentName, role } = body
    if (!name || !email) return NextResponse.json({ error: '이름/이메일 필수' }, { status: 400 })

    let departmentId: string | null = null
    if (departmentName) {
      const dept = await prisma.department.upsert({
        where: { name: departmentName },
        create: { name: departmentName },
        update: {},
      })
      departmentId = dept.id
    }

    const hashedPw = loginPassword ? await bcrypt.hash(loginPassword, 10) : null
    const user = await prisma.user.create({
      data: {
        name,
        email,
        loginId: loginId || null,
        loginPassword: hashedPw,
        position: position || null,
        departmentId,
        userType: role || 'user',
      },
      include: { department: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ ...user, role: user.userType }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }
}

// 선택 삭제
export async function DELETE(req: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '삭제할 ID 없음' }, { status: 400 })
    }

    let deleted = 0, deactivated = 0
    for (const id of ids) {
      const count = await prisma.meetingAttendee.count({ where: { userId: id } })
      if (count > 0) {
        await prisma.user.update({ where: { id }, data: { isActive: false } })
        deactivated++
      } else {
        await prisma.user.delete({ where: { id } })
        deleted++
      }
    }
    return NextResponse.json({ success: true, message: `삭제 ${deleted}명, 비활성화 ${deactivated}명` })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 })
  }
}
