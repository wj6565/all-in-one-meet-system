export type MeetingStatus = 
  | 'draft'
  | 'recording'
  | 'uploaded'
  | 'transcribing'
  | 'transcribed'
  | 'summarizing'
  | 'summarized'
  | 'excel_generated'
  | 'emailed'
  | 'failed'

export interface SummaryData {
  meetingTitle: string
  dateTime: string
  roomName: string
  attendees: Array<{
    name: string
    department?: string
    position?: string
    email: string
  }>
  mainContent: string
  decisions: string[]
  actionItems: Array<{
    assignee: string
    task: string
    dueDate?: string
    status: string
  }>
  pendingIssues: string[]
  nextSteps: string[]
}

export interface TranscriptSegment {
  speaker?: string
  text: string
  startTime?: number
  endTime?: number
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface ProcessingResult {
  success: boolean
  data?: unknown
  error?: string
}

export type EmailProvider = 'mock' | 'smtp' | 'sendgrid' | 'mailgun' | 'resend'
export type STTProvider = 'mock' | 'openai' | 'azure' | 'clova'
export type SummaryProvider = 'mock' | 'openai' | 'claude' | 'azure'
