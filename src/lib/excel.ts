import * as XLSX from 'xlsx'
import { SummaryData } from '@/types'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export function generateMeetingExcel(params: {
  summary: SummaryData
  transcriptText: string
  meetingId: string
}): Buffer {
  const { summary, transcriptText } = params

  const wb = XLSX.utils.book_new()

  // ============================================================
  // Sheet 1: Summary (회의 기본정보 + 요약)
  // ============================================================
  const summaryData: unknown[][] = [
    ['회의록'],
    [],
    ['■ 회의 기본정보'],
    ['회의명', summary.meetingTitle],
    ['일시', summary.dateTime],
    ['회의실', summary.roomName],
    ['참석자 수', `${summary.attendees.length}명`],
    [],
    ['■ 회의 주요내용'],
    [summary.mainContent],
    [],
    ['■ 결정사항'],
    ...summary.decisions.map((d, i) => [`${i + 1}. ${d}`]),
    [],
    ['■ 미결 이슈'],
    ...summary.pendingIssues.map((i, idx) => [`${idx + 1}. ${i}`]),
    [],
    ['■ 다음 단계'],
    ...summary.nextSteps.map((s, i) => [`${i + 1}. ${s}`]),
  ]

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

  // 스타일 설정 (제목 row)
  wsSummary['A1'] = { v: '회의록', t: 's' }
  if (!wsSummary['!cols']) wsSummary['!cols'] = []
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 60 }]

  // 병합 셀 (주요내용, 각 텍스트 블록)
  if (!wsSummary['!merges']) wsSummary['!merges'] = []
  wsSummary['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } })

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // ============================================================
  // Sheet 2: Attendees (참석자)
  // ============================================================
  const attendeeHeaders = ['부서', '직급', '성명', '이메일']
  const attendeeRows = summary.attendees.map(a => [
    a.department || '',
    a.position || '',
    a.name,
    a.email,
  ])

  const wsAttendees = XLSX.utils.aoa_to_sheet([attendeeHeaders, ...attendeeRows])
  wsAttendees['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsAttendees, 'Attendees')

  // ============================================================
  // Sheet 3: ActionItems (후속 조치)
  // ============================================================
  const actionHeaders = ['담당자', '액션아이템', '기한', '상태']
  const actionRows = summary.actionItems.map(a => [
    a.assignee,
    a.task,
    a.dueDate || '',
    a.status === 'done' ? '완료' : a.status === 'in_progress' ? '진행중' : '대기',
  ])

  const wsActions = XLSX.utils.aoa_to_sheet([actionHeaders, ...actionRows])
  wsActions['!cols'] = [{ wch: 15 }, { wch: 50 }, { wch: 20 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsActions, 'ActionItems')

  // ============================================================
  // Sheet 4: Transcript (전사 원문)
  // ============================================================
  const transcriptLines = transcriptText.split('\n').map(line => [line])
  const wsTranscript = XLSX.utils.aoa_to_sheet([['전사 원문'], [], ...transcriptLines])
  wsTranscript['!cols'] = [{ wch: 120 }]
  XLSX.utils.book_append_sheet(wb, wsTranscript, 'Transcript')

  // Buffer로 변환
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return buffer
}

export function parseUserExcel(buffer: Buffer): {
  data: Array<{
    name: string
    email: string
    department: string
    position: string
  }>
  errors: string[]
} {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

  const data: Array<{ name: string; email: string; department: string; position: string }> = []
  const errors: string[] = []

  if (rows.length < 2) {
    errors.push('데이터가 없습니다. 최소 1개의 사용자 행이 필요합니다.')
    return { data, errors }
  }

  // 헤더 행 파싱 (첫 번째 행)
  const headers = (rows[0] as string[]).map(h => String(h || '').trim().toLowerCase())
  
  // 컬럼 인덱스 찾기 (유연한 매핑)
  const nameIdx = headers.findIndex(h => ['성명', '이름', 'name'].includes(h))
  const emailIdx = headers.findIndex(h => ['이메일', 'email', '메일'].includes(h))
  const deptIdx = headers.findIndex(h => ['부서', '부서명', 'department'].includes(h))
  const posIdx = headers.findIndex(h => ['직급', '직위', 'position', 'title'].includes(h))

  if (nameIdx === -1) errors.push('성명 컬럼을 찾을 수 없습니다. 헤더에 "성명" 또는 "이름"이 필요합니다.')
  if (emailIdx === -1) errors.push('이메일 컬럼을 찾을 수 없습니다. 헤더에 "이메일"이 필요합니다.')
  if (errors.length > 0) return { data, errors }

  // 데이터 행 파싱
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.every(cell => !cell)) continue // 빈 행 스킵

    const name = String(row[nameIdx] || '').trim()
    const email = String(row[emailIdx] || '').trim()
    const department = deptIdx !== -1 ? String(row[deptIdx] || '').trim() : ''
    const position = posIdx !== -1 ? String(row[posIdx] || '').trim() : ''

    if (!name) { errors.push(`${i + 1}행: 성명이 비어 있습니다.`); continue }
    if (!email) { errors.push(`${i + 1}행: 이메일이 비어 있습니다.`); continue }
    if (!email.includes('@')) { errors.push(`${i + 1}행: 이메일 형식이 올바르지 않습니다. (${email})`); continue }

    data.push({ name, email, department, position })
  }

  return { data, errors }
}

// 사용자 업로드용 샘플 엑셀 생성
export function generateSampleUserExcel(): Buffer {
  const wb = XLSX.utils.book_new()

  const sampleData = [
    ['성명', '이메일', '부서', '직급'],
    ['홍길동', 'hong@company.com', '개발팀', '팀장'],
    ['김영희', 'kim@company.com', '디자인팀', '과장'],
    ['이철수', 'lee@company.com', '마케팅팀', '대리'],
    ['박민준', 'park@company.com', '인사팀', '사원'],
    ['최지현', 'choi@company.com', '영업팀', '차장'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(sampleData)
  ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, ws, '사용자목록')

  // 안내 시트
  const guideData = [
    ['[사용자 엑셀 업로드 안내]'],
    [],
    ['컬럼명', '필수여부', '설명'],
    ['성명', '필수', '사용자 이름 (또는 "이름")'],
    ['이메일', '필수', '이메일 주소 (또는 "email")'],
    ['부서', '선택', '소속 부서명'],
    ['직급', '선택', '직급 또는 직위'],
    [],
    ['※ 주의사항:'],
    ['- 첫 번째 행은 반드시 헤더 행이어야 합니다.'],
    ['- 이메일은 중복될 수 없습니다.'],
    ['- 기존에 등록된 이메일은 정보가 업데이트됩니다.'],
    ['- 빈 행은 자동으로 무시됩니다.'],
  ]

  const wsGuide = XLSX.utils.aoa_to_sheet(guideData)
  wsGuide['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsGuide, '업로드안내')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
}
