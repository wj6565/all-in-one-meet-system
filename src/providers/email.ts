import { SummaryData, EmailResult } from '@/types'

export interface EmailProvider {
  sendMeetingReport(params: {
    to: string
    toName: string
    summary: SummaryData
    excelBuffer?: Buffer
    excelFileName?: string
  }): Promise<EmailResult>
}

// HTML 메일 본문 생성 함수
function buildEmailHtml(summary: SummaryData): string {
  const attendeeRows = summary.attendees
    .map(a => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.department || '-'}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.position || '-'}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:500">${a.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.email}</td></tr>`)
    .join('')

  const decisionItems = summary.decisions
    .map((d, i) => `<li style="margin-bottom:6px">${d}</li>`)
    .join('')

  const actionRows = summary.actionItems
    .map(a => `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.assignee}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.task}</td><td style="padding:6px 12px;border-bottom:1px solid #eee">${a.dueDate || '-'}</td><td style="padding:6px 12px;border-bottom:1px solid #eee"><span style="background:${a.status === 'done' ? '#d1fae5' : '#fef3c7'};color:${a.status === 'done' ? '#065f46' : '#92400e'};padding:2px 8px;border-radius:9999px;font-size:12px">${a.status === 'done' ? '완료' : '진행중'}</span></td></tr>`)
    .join('')

  const issueItems = summary.pendingIssues
    .map(i => `<li style="margin-bottom:6px">${i}</li>`)
    .join('')

  const nextStepItems = summary.nextSteps
    .map(s => `<li style="margin-bottom:6px">${s}</li>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><title>회의록</title></head>
<body style="font-family:'Noto Sans KR',Arial,sans-serif;background:#f5f7fa;margin:0;padding:24px">
<div style="max-width:700px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
  
  <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;color:#fff">
    <div style="font-size:13px;opacity:0.8;margin-bottom:8px">📋 자동 생성 회의록</div>
    <h1 style="margin:0;font-size:24px;font-weight:700">${summary.meetingTitle}</h1>
    <div style="margin-top:12px;font-size:14px;opacity:0.9">
      📅 ${summary.dateTime} &nbsp;|&nbsp; 📍 ${summary.roomName}
    </div>
  </div>

  <div style="padding:32px 40px">
    
    <!-- 참석자 -->
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;border-left:4px solid #2563eb;padding-left:12px;margin-bottom:16px">참석자 (${summary.attendees.length}명)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#f8fafc">
          <th style="padding:8px 12px;text-align:left;color:#64748b">부서</th>
          <th style="padding:8px 12px;text-align:left;color:#64748b">직급</th>
          <th style="padding:8px 12px;text-align:left;color:#64748b">성명</th>
          <th style="padding:8px 12px;text-align:left;color:#64748b">이메일</th>
        </tr></thead>
        <tbody>${attendeeRows}</tbody>
      </table>
    </section>

    <!-- 주요 내용 -->
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;border-left:4px solid #2563eb;padding-left:12px;margin-bottom:16px">회의 주요 내용</h2>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:14px;line-height:1.8;color:#374151;white-space:pre-wrap">${summary.mainContent}</div>
    </section>

    <!-- 결정사항 -->
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;border-left:4px solid #2563eb;padding-left:12px;margin-bottom:16px">결정사항</h2>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8">${decisionItems}</ul>
    </section>

    <!-- 후속 조치 -->
    ${summary.actionItems.length > 0 ? `
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;border-left:4px solid #f59e0b;padding-left:12px;margin-bottom:16px">후속 조치 (Action Items)</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#fffbeb">
          <th style="padding:8px 12px;text-align:left;color:#92400e">담당자</th>
          <th style="padding:8px 12px;text-align:left;color:#92400e">할 일</th>
          <th style="padding:8px 12px;text-align:left;color:#92400e">기한</th>
          <th style="padding:8px 12px;text-align:left;color:#92400e">상태</th>
        </tr></thead>
        <tbody>${actionRows}</tbody>
      </table>
    </section>` : ''}

    <!-- 미결 이슈 -->
    ${summary.pendingIssues.length > 0 ? `
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;border-left:4px solid #ef4444;padding-left:12px;margin-bottom:16px">미결 이슈</h2>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8">${issueItems}</ul>
    </section>` : ''}

    <!-- 다음 단계 -->
    ${summary.nextSteps.length > 0 ? `
    <section style="margin-bottom:32px">
      <h2 style="font-size:16px;font-weight:700;color:#1e293b;border-left:4px solid #10b981;padding-left:12px;margin-bottom:16px">다음 단계</h2>
      <ul style="margin:0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8">${nextStepItems}</ul>
    </section>` : ''}

  </div>
  
  <div style="background:#f8fafc;padding:20px 40px;text-align:center;font-size:12px;color:#94a3b8">
    이 메일은 회의 자동녹음/요약 시스템에서 자동으로 발송되었습니다.<br>
    첨부 파일에서 상세한 회의록 엑셀 파일을 확인하세요.
  </div>
</div>
</body></html>`
}

// =====================
// MOCK Provider
// =====================
class MockEmailProvider implements EmailProvider {
  async sendMeetingReport(params: {
    to: string
    toName: string
    summary: SummaryData
    excelBuffer?: Buffer
    excelFileName?: string
  }): Promise<EmailResult> {
    await new Promise(resolve => setTimeout(resolve, 500))

    console.log(`[MOCK 메일 발송] To: ${params.to} (${params.toName})`)
    console.log(`  제목: [회의록] ${params.summary.meetingTitle}`)
    console.log(`  엑셀 첨부: ${params.excelFileName || '없음'}`)
    console.log(`  [Mock 모드] 실제 발송 안됨 - 설정에서 실제 provider를 선택하세요`)

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    }
  }
}

// =====================
// SMTP Provider (Gmail, 회사 SMTP 등)
// =====================
class SMTPEmailProvider implements EmailProvider {
  private config: {
    host: string
    port: number
    secure: boolean
    user: string
    password: string
    fromName: string
    fromAddress: string
  }

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
      fromName: process.env.EMAIL_FROM_NAME || '회의록 시스템',
      fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || '',
    }
  }

  async sendMeetingReport(params: {
    to: string
    toName: string
    summary: SummaryData
    excelBuffer?: Buffer
    excelFileName?: string
  }): Promise<EmailResult> {
    const nodemailer = await import('nodemailer')
    
    const transporter = nodemailer.default.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
    })

    const subject = `[회의록] ${params.summary.meetingTitle} - ${params.summary.dateTime}`
    const html = buildEmailHtml(params.summary)

    const attachments = []
    if (params.excelBuffer && params.excelFileName) {
      attachments.push({
        filename: params.excelFileName,
        content: params.excelBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    }

    try {
      const info = await transporter.sendMail({
        from: `"${this.config.fromName}" <${this.config.fromAddress}>`,
        to: `"${params.toName}" <${params.to}>`,
        subject,
        html,
        attachments,
      })

      return { success: true, messageId: info.messageId }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

// =====================
// SendGrid Provider
// =====================
class SendGridEmailProvider implements EmailProvider {
  private apiKey: string
  private fromName: string
  private fromAddress: string

  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || ''
    this.fromName = process.env.EMAIL_FROM_NAME || '회의록 시스템'
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || ''
  }

  async sendMeetingReport(params: {
    to: string
    toName: string
    summary: SummaryData
    excelBuffer?: Buffer
    excelFileName?: string
  }): Promise<EmailResult> {
    const subject = `[회의록] ${params.summary.meetingTitle} - ${params.summary.dateTime}`
    const html = buildEmailHtml(params.summary)

    const attachments = []
    if (params.excelBuffer && params.excelFileName) {
      attachments.push({
        content: params.excelBuffer.toString('base64'),
        filename: params.excelFileName,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: 'attachment',
      })
    }

    const payload = {
      personalizations: [{ to: [{ email: params.to, name: params.toName }] }],
      from: { email: this.fromAddress, name: this.fromName },
      subject,
      content: [{ type: 'text/html', value: html }],
      ...(attachments.length > 0 ? { attachments } : {}),
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`
      return { success: true, messageId }
    } else {
      const errorText = await response.text()
      return { success: false, error: `SendGrid Error ${response.status}: ${errorText}` }
    }
  }
}

// =====================
// Resend Provider
// =====================
class ResendEmailProvider implements EmailProvider {
  private apiKey: string
  private fromName: string
  private fromAddress: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
    this.fromName = process.env.EMAIL_FROM_NAME || '회의록 시스템'
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || ''
  }

  async sendMeetingReport(params: {
    to: string
    toName: string
    summary: SummaryData
    excelBuffer?: Buffer
    excelFileName?: string
  }): Promise<EmailResult> {
    const subject = `[회의록] ${params.summary.meetingTitle} - ${params.summary.dateTime}`
    const html = buildEmailHtml(params.summary)

    const attachments = []
    if (params.excelBuffer && params.excelFileName) {
      attachments.push({
        filename: params.excelFileName,
        content: params.excelBuffer.toString('base64'),
      })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.fromName} <${this.fromAddress}>`,
        to: [params.to],
        subject,
        html,
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    })

    if (response.ok) {
      const data = await response.json() as { id: string }
      return { success: true, messageId: data.id }
    } else {
      const errorText = await response.text()
      return { success: false, error: `Resend Error ${response.status}: ${errorText}` }
    }
  }
}

// =====================
// Provider Factory
// =====================
export function createEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'mock'

  switch (provider) {
    case 'smtp':
      return new SMTPEmailProvider()
    case 'sendgrid':
      return new SendGridEmailProvider()
    case 'resend':
      return new ResendEmailProvider()
    case 'mock':
    default:
      return new MockEmailProvider()
  }
}

export { buildEmailHtml }
