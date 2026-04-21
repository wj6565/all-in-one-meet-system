# 🎙️ 회의 자동녹음/요약 시스템

브라우저 기반 회의 자동 녹음 → STT 전사 → AI 요약 → 엑셀 생성 → 메일 자동 발송 웹앱

## 📋 현재 구현 기능

### ✅ 완성된 기능
- **메인 페이지**: 회의 시작 / 관리자 진입 허브
- **회의 실행 화면** (`/meeting`): 회의실 선택, 참석자 체크, 브라우저 녹음, 상태 폴링
- **관리자 로그인** (`/admin/login`): NextAuth 인증
- **대시보드** (`/admin/dashboard`): 통계, 최근 회의 현황, 빠른 액션
- **회의실 관리** (`/admin/rooms`): CRUD, 태블릿 모드 설정, PIN 관리
- **사용자 관리** (`/admin/users`): CRUD, 활성/비활성 토글
- **엑셀 업로드** (`/admin/upload`): 드래그앤드롭 엑셀 일괄 등록, 샘플 템플릿 다운로드
- **회의 기록** (`/admin/meetings`): 검색/필터, 상태 조회, 재처리 버튼
- **회의 상세** (`/admin/meetings/[id]`): 요약/전사/처리로그 탭, 엑셀·전사 다운로드
- **메일 이력** (`/admin/email-logs`): 전체 발송 현황, 통계
- **시스템 설정** (`/admin/settings`): Provider 설정 (STT/요약/메일)

### ✅ 백엔드 파이프라인
- MediaRecorder API 기반 브라우저 녹음
- 상태 흐름: `draft → recording → uploaded → transcribing → summarized → excel_generated → emailed → failed`
- STT Provider 추상화 (Mock / OpenAI Whisper / Azure / Clova)
- 요약 Provider 추상화 (Mock / OpenAI GPT / Claude)
- 이메일 Provider 추상화 (Mock / SMTP / SendGrid / Mailgun)
- Excel 4시트 생성 (Summary, Attendees, ActionItems, Transcript)
- 실패 시 재처리 버튼

## 🚀 빠른 시작

### 1. 설치 및 초기 설정

```bash
git clone <repo-url>
cd webapp

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일 편집 (NEXTAUTH_SECRET 등 변경 필수)

# 데이터베이스 마이그레이션
npx prisma migrate dev --name init

# 시드 데이터 삽입 (관리자 계정 + 샘플 데이터)
npm run seed

# 개발 서버 시작
npm run dev
```

### 2. 데모 계정
| 구분 | 이메일 | 비밀번호 |
|------|--------|---------|
| 관리자 | admin@company.com | admin1234 |

### 3. 주요 URL
| 경로 | 설명 |
|------|------|
| `/` | 메인 허브 |
| `/meeting` | 회의 실행 (참석자 선택 → 녹음 → 결과) |
| `/admin` | 관리자 페이지 리다이렉트 |
| `/admin/login` | 관리자 로그인 |
| `/admin/dashboard` | 대시보드 |
| `/admin/rooms` | 회의실 관리 |
| `/admin/users` | 사용자 관리 |
| `/admin/upload` | 엑셀 대량 업로드 |
| `/admin/meetings` | 회의 기록 조회 |
| `/admin/email-logs` | 메일 발송 이력 |
| `/admin/settings` | 시스템 설정 |

## 🗄️ 데이터 구조

### DB 모델 (SQLite/PostgreSQL)
```
Account       - 관리자 계정
Department    - 부서
User          - 회의 참석자
Room          - 회의실
Meeting       - 회의 (상태 + 녹음/전사/요약 데이터)
MeetingAttendee - 회의-참석자 관계
EmailLog      - 이메일 발송 이력
ActionItem    - 후속 조치 항목
ProcessLog    - 처리 단계별 로그
Setting       - 시스템 설정 (KV)
UploadHistory - 엑셀 업로드 이력
```

### Excel 출력 형식 (4개 시트)
1. **Summary** - 회의 기본정보, 주요내용, 결정사항, 미결이슈, 다음단계
2. **Attendees** - 부서/직급/성명/이메일
3. **ActionItems** - 담당자, 할일, 기한, 상태
4. **Transcript** - 전체 전사 텍스트

## ⚙️ Provider 설정 가이드

### STT (음성 인식)

| Provider | 설정값 | 필요 env |
|----------|--------|----------|
| Mock (테스트) | `STT_PROVIDER=mock` | 없음 |
| OpenAI Whisper | `STT_PROVIDER=openai` | `OPENAI_API_KEY` |
| Azure Speech | `STT_PROVIDER=azure` | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` |
| Naver Clova | `STT_PROVIDER=clova` | `CLOVA_STT_CLIENT_ID`, `CLOVA_STT_CLIENT_SECRET` |

### 요약 AI

| Provider | 설정값 | 필요 env |
|----------|--------|----------|
| Mock (테스트) | `SUMMARY_PROVIDER=mock` | 없음 |
| OpenAI GPT | `SUMMARY_PROVIDER=openai` | `OPENAI_API_KEY` |
| Claude | `SUMMARY_PROVIDER=claude` | `CLAUDE_API_KEY` |

### 이메일 발송

| Provider | 설정값 | 필요 env |
|----------|--------|----------|
| Mock (테스트) | `EMAIL_PROVIDER=mock` | 없음 |
| SMTP | `EMAIL_PROVIDER=smtp` | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` |
| SendGrid | `EMAIL_PROVIDER=sendgrid` | `SENDGRID_API_KEY` |
| Mailgun | `EMAIL_PROVIDER=mailgun` | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` |

## 📧 이메일 실제 연동 체크리스트

SMTP 연동 시 필요한 항목들:

- [ ] SMTP 서버 정보 확인 (호스트, 포트, TLS 여부)
- [ ] 발신 계정 생성 및 앱 비밀번호 발급
- [ ] SPF 레코드 DNS 설정 (`v=spf1 include:...`)
- [ ] DKIM 서명 설정
- [ ] DMARC 정책 설정 (`p=none` → 모니터링 후 `p=reject`)
- [ ] 테스트 메일 발송 확인
- [ ] 스팸함 분류 여부 확인
- [ ] 대량 발송 제한 정책 확인

### Gmail SMTP 설정 예시
```env
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your@gmail.com
EMAIL_PASS=abcd efgh ijkl mnop  # 앱 비밀번호 (16자리)
EMAIL_FROM_ADDRESS=your@gmail.com
```
Gmail 앱 비밀번호: Google 계정 → 보안 → 2단계 인증 → 앱 비밀번호

## 🔧 scripts

```bash
npm run dev          # 개발 서버 (Next.js)
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
npm run seed         # 시드 데이터 삽입
npm run db:reset     # DB 초기화 후 마이그레이션 + 시드
npm run lint         # ESLint
```

## 🚢 배포 가이드

### Vercel (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 환경변수 설정 (Vercel 대시보드에서 설정)
# DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL 등 필수
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### 운영 환경 체크리스트
- [ ] `NEXTAUTH_SECRET` 강력한 랜덤 문자열로 변경
- [ ] `DATABASE_URL` PostgreSQL로 변경
- [ ] `NEXTAUTH_URL` 실제 도메인으로 변경
- [ ] HTTPS 설정 (SSL 인증서)
- [ ] 파일 스토리지 S3 또는 외부 스토리지로 변경
- [ ] STT/요약 Provider 실제 API 연동
- [ ] 이메일 Provider 실제 SMTP/API 연동
- [ ] 관리자 기본 비밀번호 변경

## 📁 프로젝트 구조

```
webapp/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 메인 허브 페이지
│   │   ├── meeting/page.tsx      # 회의 실행 화면
│   │   ├── admin/                # 관리자 페이지들
│   │   └── api/                  # API 라우트
│   ├── components/
│   │   └── AdminNav.tsx          # 관리자 사이드바
│   ├── lib/
│   │   ├── prisma.ts             # DB 연결
│   │   ├── auth.ts               # NextAuth 설정
│   │   ├── meeting-processor.ts  # 분석 파이프라인
│   │   └── excel.ts              # 엑셀 생성/파싱
│   ├── providers/
│   │   ├── stt.ts                # STT Provider
│   │   ├── summary.ts            # 요약 Provider
│   │   └── email.ts              # 이메일 Provider
│   └── types/
│       └── index.ts              # TypeScript 타입
├── prisma/
│   ├── schema.prisma             # DB 스키마
│   └── seed.ts                   # 시드 데이터
├── .env.example                  # 환경변수 예시
└── README.md                     # 이 파일
```

## 🔒 보안 고려사항

- 관리자 페이지: NextAuth 세션 기반 인증
- 회의 실행 페이지: 인증 없이 접근 가능 (사내망 운용 가정)
- 비밀번호: bcryptjs 해싱
- 파일 업로드: 확장자/크기 검증
- SQL Injection: Prisma ORM으로 방지

## 📊 상태 흐름

```
draft → recording → uploaded → transcribing → transcribed
     → summarizing → summarized → excel_generated → emailed
                                                  ↘ failed (언제든 실패 가능)
```

---

**개발**: Mock 모드로 실제 API 없이 전체 흐름 테스트 가능  
**운영**: `.env` 파일에서 Provider를 변경하면 즉시 실제 API 연동
