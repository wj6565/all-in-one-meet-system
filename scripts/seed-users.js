'use strict'
const { PrismaClient } = require('@prisma/client')
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
const bcrypt = require('bcryptjs')
const fs = require('fs')

const adapter = new PrismaBetterSqlite3({ url: 'file:/home/user/webapp/dev.db' })
const prisma = new PrismaClient({ adapter })

function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''))
  
  // 우측 이름→메일 매핑 (col8=이름, col9=메일)
  const rightMap = {}
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length >= 10 && cols[8] && cols[9]) {
      const name = cols[8].trim().replace(/^\uFEFF/, '')
      const email = cols[9].trim()
      if (name && email) rightMap[name] = email
    }
  }

  // 좌측 사용자 (col0=ID, col1=이름, col2=부서)
  const users = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const empId = cols[0] && cols[0].trim()
    const name = cols[1] && cols[1].trim()
    const dept = cols[2] && cols[2].trim()
    
    if (!empId || !name || !dept) continue
    
    const email = rightMap[name] || `${empId}@wonjin.co.kr`
    users.push({ empId, name, dept: dept === '-' ? '' : dept, email })
  }
  
  return users
}

async function main() {
  const users = parseCSV('/home/user/uploaded_files/계정.csv')
  console.log(`총 ${users.length}명 처리 시작...`)

  // ── 1. 관리자 계정 변경 (21368/21368) ──
  console.log('\n=== 관리자 계정 업데이트 ===')
  const adminHash = await bcrypt.hash('21368', 10)
  
  // 기존 admin@company.com 계정을 21368으로 변경
  const existingAdmin = await prisma.account.findFirst({ where: { email: 'admin@company.com' } })
  if (existingAdmin) {
    await prisma.account.update({
      where: { id: existingAdmin.id },
      data: { email: '21368', password: adminHash, name: '시스템 관리자' }
    })
    console.log('✓ admin@company.com → 21368 / 21368 변경 완료')
  } else {
    // 21368 계정이 없으면 생성
    const exists = await prisma.account.findFirst({ where: { email: '21368' } })
    if (!exists) {
      await prisma.account.create({
        data: { email: '21368', name: '시스템 관리자', password: adminHash, role: 'admin', isActive: true }
      })
      console.log('✓ 관리자 계정 생성: 21368 / 21368')
    } else {
      await prisma.account.update({
        where: { id: exists.id },
        data: { password: adminHash }
      })
      console.log('✓ 관리자 비밀번호 갱신: 21368 / 21368')
    }
  }

  // ── 2. 사용자 일괄 등록 ──
  console.log('\n=== 사용자 일괄 등록 ===')
  let added = 0, updated = 0, errors = 0

  for (const u of users) {
    try {
      const passwordHash = await bcrypt.hash(u.empId, 10)
      
      let departmentId = null
      if (u.dept) {
        const dept = await prisma.department.upsert({
          where: { name: u.dept },
          create: { name: u.dept },
          update: {}
        })
        departmentId = dept.id
      }

      // loginId(사번)로 기존 확인
      const existingByLoginId = u.empId ? await prisma.user.findUnique({ where: { loginId: u.empId } }) : null
      const existingByEmail = await prisma.user.findUnique({ where: { email: u.email } })
      const existing = existingByLoginId || existingByEmail

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { name: u.name, email: u.email, departmentId, loginId: u.empId, loginPassword: passwordHash, role: 'user', isActive: true }
        })
        updated++
      } else {
        await prisma.user.create({
          data: { name: u.name, email: u.email, departmentId, loginId: u.empId, loginPassword: passwordHash, role: 'user', isActive: true }
        })
        added++
      }
    } catch (err) {
      console.error(`  ✗ 오류 - ${u.empId} ${u.name}: ${err.message}`)
      errors++
    }
  }

  console.log(`\n=== 결과 ===`)
  console.log(`신규 등록: ${added}명`)
  console.log(`업데이트: ${updated}명`)
  console.log(`오류: ${errors}명`)
  
  const finalCount = await prisma.user.count()
  console.log(`최종 DB 사용자 수: ${finalCount}명`)
  
  // 이메일 매칭 안 된 사용자 목록
  const noRealEmail = users.filter(u => u.email.endsWith('@wonjin.co.kr') && !u.email.includes('@wonjin.co.kr'.replace('@', '')))
  const tempEmailCount = users.filter(u => u.email === `${u.empId}@wonjin.co.kr`).length
  console.log(`\n임시이메일(사번@wonjin.co.kr) 사용: ${tempEmailCount}명`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
