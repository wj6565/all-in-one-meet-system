import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'

const prisma = new PrismaClient()

// CSV 파싱
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').map(l => l.replace(/\r$/, ''))
  
  // 우측 이름→메일 매핑
  const rightMap = {}
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length >= 10 && cols[8]?.trim() && cols[9]?.trim()) {
      const name = cols[8].trim().replace(/^\uFEFF/, '')
      const email = cols[9].trim()
      rightMap[name] = email
    }
  }

  // 좌측 사용자 (ID, 이름, 부서 있는 행)
  const users = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const empId = cols[0]?.trim()
    const name = cols[1]?.trim()
    const dept = cols[2]?.trim()
    
    if (!empId || !name || !dept || dept === '-') continue
    
    const email = rightMap[name] || `${empId}@wonjin.co.kr`
    users.push({ empId, name, dept, email })
  }
  
  return users
}

async function main() {
  const users = parseCSV('/home/user/uploaded_files/계정.csv')
  console.log(`총 ${users.length}명 처리 시작...`)

  // ── 1. 관리자 계정 업데이트 (21368/21368) ──
  console.log('\n=== 관리자 계정 업데이트 ===')
  const adminHash = await bcrypt.hash('21368', 10)
  
  // 기존 admin 계정 업데이트
  const existingAdmin = await prisma.account.findFirst({ where: { email: 'admin@company.com' } })
  if (existingAdmin) {
    await prisma.account.update({
      where: { id: existingAdmin.id },
      data: {
        email: '21368',
        name: '시스템 관리자',
        password: adminHash,
      }
    })
    console.log('기존 관리자 계정: admin@company.com → 21368 / 21368 으로 변경')
  }
  
  // 21368 이메일로 계정이 없으면 신규 생성
  const newAdmin = await prisma.account.findFirst({ where: { email: '21368' } })
  if (!newAdmin) {
    await prisma.account.create({
      data: {
        email: '21368',
        name: '시스템 관리자',
        password: adminHash,
        role: 'admin',
        isActive: true,
      }
    })
    console.log('관리자 계정 생성: 21368 / 21368')
  } else {
    console.log('관리자 계정 확인: 21368 / 21368')
  }

  // ── 2. 기존 시스템에서 테스트용 사용자 확인 ──
  const existingCount = await prisma.user.count()
  console.log(`\n현재 DB 사용자 수: ${existingCount}명`)

  // ── 3. 사용자 일괄 등록 ──
  console.log('\n=== 사용자 일괄 등록 ===')
  let added = 0, updated = 0, errors = 0

  for (const u of users) {
    try {
      const passwordHash = await bcrypt.hash(u.empId, 10)
      
      // 부서 upsert
      let departmentId = null
      if (u.dept) {
        const dept = await prisma.department.upsert({
          where: { name: u.dept },
          create: { name: u.dept },
          update: {}
        })
        departmentId = dept.id
      }

      // loginId(사번)로 기존 사용자 확인
      const existingByLoginId = await prisma.user.findUnique({ where: { loginId: u.empId } })
      // email로도 확인
      const existingByEmail = await prisma.user.findUnique({ where: { email: u.email } })

      const existing = existingByLoginId || existingByEmail

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: u.name,
            email: u.email,
            departmentId,
            loginId: u.empId,
            loginPassword: passwordHash,
            role: 'user',
            isActive: true,
          }
        })
        updated++
      } else {
        await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            departmentId,
            loginId: u.empId,
            loginPassword: passwordHash,
            role: 'user',
            isActive: true,
          }
        })
        added++
      }
    } catch (err) {
      console.error(`  오류 - ${u.empId} ${u.name}: ${err.message}`)
      errors++
    }
  }

  console.log(`\n완료: 신규 ${added}명, 업데이트 ${updated}명, 오류 ${errors}명`)
  
  const finalCount = await prisma.user.count()
  console.log(`최종 DB 사용자 수: ${finalCount}명`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
