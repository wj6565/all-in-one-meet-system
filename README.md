# ALL IN ONE MEET SYSTEM

## 프로젝트 개요
회의실 예약, 회의 녹음, 전사, AI 요약, 자동 메일 발송을 통합한 올인원 회의 관리 시스템

- **기업**: 원진 그룹 (WONJIN Group)
- **플랫폼**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **DB**: SQLite (Prisma ORM, `dev.db`)

---

## 주요 기능

| 기능 | 경로 | 설명 |
|------|------|------|
| 로그인 | `/login` | 관리자(이메일)/일반사용자(사번ID)/태블릿 계정 |
| 메인 홈 | `/home` | 서비스 선택 메뉴 |
| 회의실 예약 | `/booking` | 현황판/목록 뷰, 빠른예약, 태블릿 바로가기 |
| 태블릿 대시보드 | `/tablet` | 전체 회의실 현황 (실시간) |
| 태블릿 개별 | `/tablet/[roomId]` | 특정 회의실 전용 (PIN 인증 지원) |
| 회의 녹음 | `/meeting` | 녹음·전사·요약·이메일 자동 발송 |
| 관리자 | `/admin` | 사용자/회의실/예약 관리 (탭 기반) |

---

## 관리자 기능

- **사용자 관리**: 추가/수정/삭제/비활성화, 권한 변경 (일반↔관리자↔태블릿)
- **회의실 관리**: 추가/수정/삭제, 태블릿 모드/PIN 설정, 태블릿 화면 바로열기
- **예약 관리**: 날짜/회의실/상태 필터, 예약 취소

---

## 로그인 계정 종류

| 구분 | 로그인 방식 | 예시 |
|------|------------|------|
| 관리자(Account) | 이메일 주소 | `admin@company.com` |
| 일반 사용자(User) | 사번/아이디 | `hong`, `21001` 등 |
| 태블릿(User) | 태블릿 전용 ID | `tablet1` 등 |

---

## 기술 스택

- **Frontend**: Next.js 16 (Turbopack), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (App Router)
- **Auth**: 커스텀 JWT (`/api/auth/login`, `/api/auth/me`)
- **DB**: SQLite + Prisma ORM (better-sqlite3)
- **Icons**: Font Awesome 6.5.1 (CDN)
- **Process**: PM2 (개발 서버 관리)

---

## 환경 설정

### 필수 환경변수 (`.env`)
```
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=integrated-meet-system-secret-2026
NEXTAUTH_URL=http://localhost:3000
```

### DB 초기화
```bash
# Prisma 클라이언트 생성
npx prisma generate

# DB 마이그레이션
DATABASE_URL=file:./dev.db npx prisma db push

# 시드 데이터 삽입
DATABASE_URL=file:./dev.db npx ts-node prisma/seed.ts
```

---

## 개발 서버 실행

```bash
# 의존성 설치
npm install

# 개발 서버 (PM2)
pm2 start ecosystem.config.cjs

# 직접 실행
npm run dev
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── login/         # 로그인 페이지
│   ├── home/          # 메인 홈
│   ├── booking/       # 회의실 예약
│   ├── tablet/        # 태블릿 대시보드
│   │   └── [roomId]/  # 특정 회의실 태블릿 뷰
│   ├── meeting/       # 회의 녹음
│   ├── admin/         # 관리자 (탭형 단일 페이지)
│   └── api/           # API 라우트
│       ├── auth/      # 인증 (login, me, signout)
│       ├── admin/     # 관리자 API
│       ├── bookings/  # 예약 API
│       └── rooms/     # 회의실 API
├── lib/
│   ├── prisma.ts      # Prisma 클라이언트
│   ├── get-session.ts # JWT 세션 검증 헬퍼
│   └── auth-instance.ts # NextAuth 설정
└── proxy.ts           # Next.js 라우트 보호 (구 middleware)
```

---

## 배포 상태

- **환경**: 개발 서버 (Next.js dev + Turbopack)
- **포트**: 3000
- **PM2**: meeting-system (서비스) + keepalive (자동 워밍업)
- **마지막 업데이트**: 2026-04-22
