import { SummaryData } from '@/types'

export interface SummaryProvider {
  summarize(params: {
    transcript: string
    meetingTitle: string
    attendees: Array<{ name: string; department?: string; position?: string; email: string }>
    roomName: string
    startedAt: Date
  }): Promise<SummaryData>
}

// =====================
// MOCK Provider
// =====================
class MockSummaryProvider implements SummaryProvider {
  async summarize(params: {
    transcript: string
    meetingTitle: string
    attendees: Array<{ name: string; department?: string; position?: string; email: string }>
    roomName: string
    startedAt: Date
  }): Promise<SummaryData> {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { meetingTitle, attendees, roomName, startedAt } = params

    return {
      meetingTitle,
      dateTime: startedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      roomName,
      attendees,
      mainContent: `[Mock 요약] 이번 회의에서는 "${meetingTitle}"에 관한 내용을 논의하였습니다.\n\n주요 안건:\n1. 이번 분기 프로젝트 진행 현황 공유\n2. 개발 일정 지연 원인 분석 및 대응 방안 논의\n3. 출시 일정 확정\n4. 다음 회의 일정 조율\n\n개발팀의 신규 기능 개발이 80% 완료되었으며, 약 일주일의 지연이 발생하였습니다. 디자인 팀의 UI/UX 개선 작업은 완료되었습니다.`,
      decisions: [
        '다음 달 출시 일정은 기존 계획대로 유지하기로 결정',
        '개발 지연 원인 분석 보고서를 다음 주까지 제출하기로 결정',
        '다음 회의는 다음 주 월요일 오전 10시로 확정',
      ],
      actionItems: [
        {
          assignee: attendees[1]?.name || '박과장',
          task: '개발 지연 원인 분석 및 대책 마련',
          dueDate: '다음 주까지',
          status: 'pending',
        },
        {
          assignee: attendees[2]?.name || '이대리',
          task: '마케팅 자료 준비 (출시 2주 전까지)',
          dueDate: '출시 2주 전',
          status: 'pending',
        },
        {
          assignee: attendees[1]?.name || '박과장',
          task: '기술적 이슈 해결',
          dueDate: '이번 주 내',
          status: 'in_progress',
        },
      ],
      pendingIssues: [
        '개발 지연에 따른 추가 리소스 투입 여부',
        'UI/UX 개선안 최종 검토 결과',
      ],
      nextSteps: [
        '다음 주 월요일 오전 10시 후속 회의 진행',
        '개발팀 지연 원인 분석 보고서 검토',
        'UI/UX 최종 검토 및 승인',
      ],
    }
  }
}

// =====================
// OpenAI GPT Provider
// =====================
class OpenAISummaryProvider implements SummaryProvider {
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'gpt-4o-mini') {
    this.apiKey = apiKey
    this.model = model
  }

  async summarize(params: {
    transcript: string
    meetingTitle: string
    attendees: Array<{ name: string; department?: string; position?: string; email: string }>
    roomName: string
    startedAt: Date
  }): Promise<SummaryData> {
    const { transcript, meetingTitle, attendees, roomName, startedAt } = params

    const attendeeList = attendees.map(a => 
      `${a.name}${a.department ? ` (${a.department}` : ''}${a.position ? ` ${a.position}` : ''}${a.department ? ')' : ''}`
    ).join(', ')

    const prompt = `다음 회의 전사 내용을 분석하여 한국어로 회의 요약을 작성해 주세요.

회의 정보:
- 회의명: ${meetingTitle}
- 일시: ${startedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
- 장소: ${roomName}
- 참석자: ${attendeeList}

전사 내용:
${transcript}

다음 JSON 형식으로 정확히 응답해 주세요:
{
  "mainContent": "회의 주요 내용 (상세하게)",
  "decisions": ["결정사항1", "결정사항2"],
  "actionItems": [
    {"assignee": "담당자명", "task": "할 일", "dueDate": "기한(없으면 null)", "status": "pending"}
  ],
  "pendingIssues": ["미결 이슈1", "미결 이슈2"],
  "nextSteps": ["다음 단계1", "다음 단계2"]
}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: '당신은 전문 회의록 작성자입니다. 회의 전사 내용을 분석하여 명확하고 구조적인 회의록을 작성합니다.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`)
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> }
    const result = JSON.parse(data.choices[0].message.content)

    return {
      meetingTitle,
      dateTime: startedAt.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      roomName,
      attendees,
      mainContent: result.mainContent || '',
      decisions: result.decisions || [],
      actionItems: result.actionItems || [],
      pendingIssues: result.pendingIssues || [],
      nextSteps: result.nextSteps || [],
    }
  }
}

// =====================
// Provider Factory
// =====================
export function createSummaryProvider(): SummaryProvider {
  const provider = process.env.SUMMARY_PROVIDER || 'mock'

  switch (provider) {
    case 'openai':
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.')
      return new OpenAISummaryProvider(apiKey, process.env.OPENAI_MODEL)
    case 'mock':
    default:
      return new MockSummaryProvider()
  }
}
