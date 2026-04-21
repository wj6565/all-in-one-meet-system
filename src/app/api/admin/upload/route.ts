import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth-instance'
import { parseUserExcel } from '@/lib/excel'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const mode = (formData.get('mode') as string) || 'upsert' // upsert | add-only

  if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return NextResponse.json({ error: '엑셀 파일(.xlsx)만 업로드 가능합니다.' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const { data, errors } = parseUserExcel(buffer)

  if (errors.length > 0 && data.length === 0) {
    return NextResponse.json({ error: '파일 파싱 실패', errors }, { status: 400 })
  }

  let addedRows = 0
  let updatedRows = 0
  let errorRows = 0
  const rowErrors: string[] = [...errors]

  for (const row of data) {
    try {
      let departmentId: string | undefined
      if (row.department) {
        const dept = await prisma.department.upsert({
          where: { name: row.department },
          create: { name: row.department },
          update: {}
        })
        departmentId = dept.id
      }

      const existing = await prisma.user.findUnique({ where: { email: row.email } })

      if (existing) {
        if (mode === 'upsert') {
          await prisma.user.update({
            where: { email: row.email },
            data: {
              name: row.name,
              departmentId,
              position: row.position || undefined,
              isActive: true,
            }
          })
          updatedRows++
        }
        // add-only 모드면 기존 사용자는 스킵
      } else {
        await prisma.user.create({
          data: {
            name: row.name,
            email: row.email,
            departmentId,
            position: row.position || undefined,
          }
        })
        addedRows++
      }
    } catch (err) {
      errorRows++
      rowErrors.push(`${row.email}: ${String(err)}`)
    }
  }

  // 업로드 이력 저장
  await prisma.uploadHistory.create({
    data: {
      fileName: file.name,
      totalRows: data.length,
      addedRows,
      updatedRows,
      errorRows,
      errorDetail: rowErrors.length > 0 ? JSON.stringify(rowErrors) : null,
      uploadedBy: session.user?.id,
    }
  })

  return NextResponse.json({
    success: true,
    totalRows: data.length,
    addedRows,
    updatedRows,
    errorRows,
    errors: rowErrors,
    preview: data.slice(0, 5),
  })
}
