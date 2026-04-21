// Node.js 순수 스크립트로 SQLite에 직접 시드 데이터 입력
import { createRequire } from 'module'
import { randomBytes, createHash } from 'crypto'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const DB_PATH = './dev.db'
const db = new Database(DB_PATH)

function cuid() {
  const timestamp = Date.now().toString(36)
  const random = randomBytes(12).toString('base64url').replace(/[^a-z0-9]/g, '').slice(0, 20)
  return 'c' + timestamp + random
}

async function main() {
  console.log('🌱 샘플 데이터 생성 중...')

  // 관리자 계정
  const adminId = cuid()
  const hashedPwd = await bcrypt.hash('admin1234', 10)
  const now = new Date().toISOString()
  
  db.prepare(`INSERT OR IGNORE INTO Account (id, email, password, name, role, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    adminId, 'admin@company.com', hashedPwd, '시스템 관리자', 'admin', 1, now, now
  )
  console.log('✅ 관리자 계정 생성')

  // 부서
  const deptNames = ['개발팀', '디자인팀', '마케팅팀', '인사팀', '영업팀', '기획팀']
  const deptMap = {}
  
  for (const name of deptNames) {
    const existing = db.prepare('SELECT id FROM Department WHERE name = ?').get(name)
    if (existing) {
      deptMap[name] = existing.id
    } else {
      const id = cuid()
      db.prepare(`INSERT INTO Department (id, name, createdAt) VALUES (?, ?, ?)`).run(id, name, now)
      deptMap[name] = id
    }
  }
  console.log('✅ 부서 생성')

  // 사용자
  const users = [
    { name: '김태원', email: 'kim@company.com', dept: '개발팀', position: '팀장' },
    { name: '박서연', email: 'park@company.com', dept: '개발팀', position: '과장' },
    { name: '이준혁', email: 'lee@company.com', dept: '디자인팀', position: '팀장' },
    { name: '최민지', email: 'choi@company.com', dept: '디자인팀', position: '대리' },
    { name: '정현우', email: 'jung@company.com', dept: '마케팅팀', position: '팀장' },
    { name: '한수빈', email: 'han@company.com', dept: '마케팅팀', position: '사원' },
    { name: '오지원', email: 'oh@company.com', dept: '인사팀', position: '과장' },
    { name: '신동엽', email: 'shin@company.com', dept: '영업팀', position: '차장' },
    { name: '강지은', email: 'kang@company.com', dept: '기획팀', position: '대리' },
    { name: '윤성민', email: 'yoon@company.com', dept: '개발팀', position: '사원' },
  ]

  for (const u of users) {
    const existing = db.prepare('SELECT id FROM User WHERE email = ?').get(u.email)
    if (!existing) {
      db.prepare(`INSERT INTO User (id, name, email, departmentId, position, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        cuid(), u.name, u.email, deptMap[u.dept], u.position, 1, now, now
      )
    }
  }
  console.log('✅ 샘플 사용자 생성')

  // 회의실
  const rooms = [
    { name: '1층 대회의실', location: '본관 1층', isTabletMode: 0, tabletPinCode: null },
    { name: '2층 소회의실 A', location: '본관 2층', isTabletMode: 1, tabletPinCode: '1234' },
    { name: '2층 소회의실 B', location: '본관 2층', isTabletMode: 0, tabletPinCode: null },
    { name: '3층 임원실', location: '본관 3층', isTabletMode: 0, tabletPinCode: null },
  ]

  for (const r of rooms) {
    const existing = db.prepare('SELECT id FROM Room WHERE name = ?').get(r.name)
    if (!existing) {
      db.prepare(`INSERT INTO Room (id, name, location, isActive, isTabletMode, tabletPinCode, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
        cuid(), r.name, r.location, 1, r.isTabletMode, r.tabletPinCode, now, now
      )
    }
  }
  console.log('✅ 회의실 생성')

  // 기본 설정
  const settings = [
    { key: 'emailFromName', value: '회의록 시스템' },
    { key: 'emailFromAddress', value: 'noreply@company.com' },
    { key: 'sttProvider', value: 'mock' },
    { key: 'summaryProvider', value: 'mock' },
    { key: 'emailProvider', value: 'mock' },
    { key: 'recordingConsent', value: '본 회의는 회의록 작성을 위해 자동으로 녹음됩니다.\n녹음 내용은 회의록 생성 후 보관 정책에 따라 관리됩니다.\n\n회의에 참여하면 녹음에 동의한 것으로 간주됩니다.' },
    { key: 'retentionDays', value: '365' },
    { key: 'emailSubjectTemplate', value: '[회의록] {title} - {date}' },
  ]

  for (const s of settings) {
    db.prepare(`INSERT OR REPLACE INTO Setting (id, key, value, updatedAt) VALUES (COALESCE((SELECT id FROM Setting WHERE key=?), ?), ?, ?, ?)`).run(
      s.key, cuid(), s.key, s.value, now
    )
  }
  console.log('✅ 기본 설정 생성')

  db.close()
  console.log('\n✨ 시드 완료!')
  console.log('\n📌 관리자 로그인:')
  console.log('   이메일: admin@company.com')
  console.log('   비밀번호: admin1234')
}

main().catch(e => { console.error(e); process.exit(1) })
