import 'dotenv/config'
import path from 'path'

// Prisma v7 with better-sqlite3 adapter
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const { PrismaClient } = require('@prisma/client')

const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 시드 데이터 생성 시작...')
  console.log('📁 DB:', dbUrl)

  // 관리자 계정
  const adminPassword = await bcrypt.hash('admin1234', 10)
  const admin = await prisma.account.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      password: adminPassword,
      name: '시스템 관리자',
      role: 'admin',
    }
  })
  console.log('✅ 관리자 계정:', admin.email)

  // 부서
  const deptNames = ['개발팀', '디자인팀', '마케팅팀', '인사팀', '영업팀', '경영지원팀']
  const deptMap: Record<string, string> = {}
  for (const name of deptNames) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name }
    })
    deptMap[name] = dept.id
  }
  console.log('✅ 부서:', deptNames.length, '개')

  // 샘플 사용자
  const users = [
    { name: '김팀장', email: 'kim.team@company.com', dept: '개발팀', pos: '팀장' },
    { name: '박과장', email: 'park@company.com', dept: '개발팀', pos: '과장' },
    { name: '이대리', email: 'lee@company.com', dept: '디자인팀', pos: '대리' },
    { name: '최주임', email: 'choi@company.com', dept: '마케팅팀', pos: '주임' },
    { name: '정사원', email: 'jung@company.com', dept: '인사팀', pos: '사원' },
    { name: '강부장', email: 'kang@company.com', dept: '경영지원팀', pos: '부장' },
    { name: '홍차장', email: 'hong@company.com', dept: '영업팀', pos: '차장' },
    { name: '윤과장', email: 'yoon@company.com', dept: '개발팀', pos: '과장' },
    { name: '임대리', email: 'lim@company.com', dept: '마케팅팀', pos: '대리' },
    { name: '오팀장', email: 'oh@company.com', dept: '디자인팀', pos: '팀장' },
  ]

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { name: u.name, email: u.email, departmentId: deptMap[u.dept], position: u.pos }
    })
  }
  console.log('✅ 사용자:', users.length, '명')

  // 회의실
  const existingRooms = await prisma.room.count()
  if (existingRooms === 0) {
    await prisma.room.createMany({
      data: [
        { name: '대회의실', location: '본관 3층', description: '최대 20명 수용' },
        { name: '소회의실 A', location: '본관 2층', description: '최대 8명 수용' },
        { name: '소회의실 B', location: '별관 1층', description: '태블릿 전용', isTabletMode: true, tabletPinCode: '1234' },
        { name: '화상회의실', location: '본관 4층', description: '화상회의 전용' },
      ]
    })
    console.log('✅ 회의실: 4개')
  }

  // 기본 설정
  const settings: [string, string][] = [
    ['emailFromName', '회의록 시스템'],
    ['emailFromAddress', 'noreply@company.com'],
    ['sttProvider', 'mock'],
    ['summaryProvider', 'mock'],
    ['emailProvider', 'mock'],
    ['recordingConsent', '본 회의는 회의록 작성을 위해 자동으로 녹음됩니다.\n녹음 내용은 보관 정책에 따라 관리됩니다.\n\n참여하면 녹음에 동의한 것으로 간주됩니다.'],
    ['retentionDays', '365'],
    ['emailSubjectTemplate', '[회의록] {title} - {date}'],
  ]

  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value }
    })
  }
  console.log('✅ 기본 설정')

  console.log('\n🎉 시드 완료!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('관리자 이메일: admin@company.com')
  console.log('관리자 비밀번호: admin1234')
  console.log('접속: http://localhost:3000')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
