import { TranscriptSegment } from '@/types'
import * as fs from 'fs'

export interface STTProvider {
  transcribe(audioPath: string): Promise<{
    text: string
    segments: TranscriptSegment[]
  }>
}

// =====================
// MOCK Provider (개발/데모용)
// =====================
class MockSTTProvider implements STTProvider {
  async transcribe(audioPath: string): Promise<{ text: string; segments: TranscriptSegment[] }> {
    // 실제 파일 크기를 기반으로 시뮬레이션
    let fileSize = 0
    try {
      const stat = fs.statSync(audioPath)
      fileSize = stat.size
    } catch {}

    // 파일 크기에 따라 다른 mock 결과 반환
    await new Promise(resolve => setTimeout(resolve, 1500)) // 처리 시뮬레이션

    const mockTranscript = `[회의 전사 결과 - Mock 모드]

김팀장: 오늘 회의를 시작하겠습니다. 이번 분기 프로젝트 진행 현황을 공유해 주시기 바랍니다.

박과장: 네, 현재 개발 팀에서는 신규 기능 개발이 80% 완료된 상태입니다. 예상보다 일주일 정도 지연되고 있습니다.

이대리: 디자인 쪽에서는 UI/UX 개선 작업이 완료되었습니다. 검토 부탁드립니다.

김팀장: 알겠습니다. 지연된 부분에 대해서는 원인을 분석하고 다음 주까지 대책을 마련해 주세요.

박과장: 네, 기술적인 이슈가 있었는데 이번 주 내로 해결할 예정입니다.

김팀장: 그리고 다음 달 출시 일정은 변경 없이 유지하는 것으로 결정하겠습니다.

이대리: 마케팅 자료는 출시 2주 전까지 준비하겠습니다.

김팀장: 좋습니다. 다음 회의는 다음 주 월요일 오전 10시로 하겠습니다. 이상으로 오늘 회의를 마치겠습니다.`

    const segments: TranscriptSegment[] = [
      { speaker: '김팀장', text: '오늘 회의를 시작하겠습니다. 이번 분기 프로젝트 진행 현황을 공유해 주시기 바랍니다.', startTime: 0 },
      { speaker: '박과장', text: '네, 현재 개발 팀에서는 신규 기능 개발이 80% 완료된 상태입니다. 예상보다 일주일 정도 지연되고 있습니다.', startTime: 15 },
      { speaker: '이대리', text: '디자인 쪽에서는 UI/UX 개선 작업이 완료되었습니다. 검토 부탁드립니다.', startTime: 35 },
      { speaker: '김팀장', text: '알겠습니다. 지연된 부분에 대해서는 원인을 분석하고 다음 주까지 대책을 마련해 주세요.', startTime: 50 },
      { speaker: '박과장', text: '네, 기술적인 이슈가 있었는데 이번 주 내로 해결할 예정입니다.', startTime: 65 },
      { speaker: '김팀장', text: '그리고 다음 달 출시 일정은 변경 없이 유지하는 것으로 결정하겠습니다.', startTime: 80 },
      { speaker: '이대리', text: '마케팅 자료는 출시 2주 전까지 준비하겠습니다.', startTime: 95 },
      { speaker: '김팀장', text: '좋습니다. 다음 회의는 다음 주 월요일 오전 10시로 하겠습니다.', startTime: 108 },
    ]

    return { text: mockTranscript, segments }
  }
}

// =====================
// OpenAI Whisper Provider
// =====================
class OpenAISTTProvider implements STTProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async transcribe(audioPath: string): Promise<{ text: string; segments: TranscriptSegment[] }> {
    // 파일 읽기
    const fileBuffer = fs.readFileSync(audioPath)
    const fileName = audioPath.split('/').pop() || 'audio.webm'
    const ext = fileName.split('.').pop()?.toLowerCase() || 'webm'

    // MIME 타입 결정 (Whisper 지원 포맷)
    const mimeMap: Record<string, string> = {
      webm: 'audio/webm',
      mp4: 'audio/mp4',
      m4a: 'audio/m4a',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    }
    const mimeType = mimeMap[ext] || 'audio/webm'

    // Node.js 내장 FormData + Blob 사용 (fetch 호환)
    const blob = new Blob([fileBuffer], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, fileName)
    form.append('model', 'whisper-1')
    form.append('language', 'ko')
    form.append('response_format', 'verbose_json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        // Content-Type은 FormData가 자동으로 boundary 포함하여 설정 — 명시하지 않음
      },
      body: form,
    })

    if (!response.ok) {
      throw new Error(`OpenAI STT API 오류: ${response.status} ${await response.text()}`)
    }

    const data = await response.json() as { text: string; segments?: Array<{ text: string; start: number; end: number }> }
    
    const segments: TranscriptSegment[] = (data.segments || []).map(s => ({
      text: s.text,
      startTime: s.start,
      endTime: s.end,
    }))

    return { text: data.text, segments }
  }
}

// =====================
// Provider Factory
// =====================
export function createSTTProvider(): STTProvider {
  const provider = process.env.STT_PROVIDER || 'mock'
  
  switch (provider) {
    case 'openai':
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.')
      return new OpenAISTTProvider(apiKey)
    case 'mock':
    default:
      return new MockSTTProvider()
  }
}
