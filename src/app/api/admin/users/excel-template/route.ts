import { NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'

export async function GET() {
  try {
    const session = await getSession()
    if (!session || session.user.userType !== 'admin') {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }

    // CSV 형식으로 템플릿 반환 (엑셀에서 열기 가능)
    const header = '성명,이메일,부서,직급,사번/아이디,비밀번호\n'
    const sample1 = '홍길동,hong@company.com,개발팀,대리,21001,Pass1234!\n'
    const sample2 = '김영희,kim@company.com,인사팀,사원,21002,Pass1234!\n'
    const csv = '\uFEFF' + header + sample1 + sample2  // BOM for Excel

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="user_upload_template.csv"',
      },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '템플릿 생성 실패' }, { status: 500 })
  }
}
