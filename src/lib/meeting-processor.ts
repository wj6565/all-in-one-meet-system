import { prisma } from './prisma'
import { createSTTProvider } from '@/providers/stt'
import { createSummaryProvider } from '@/providers/summary'
import { createEmailProvider } from '@/providers/email'
import { generateMeetingExcel } from './excel'
import * as fs from 'fs'
import * as path from 'path'
import { SummaryData } from '@/types'

async function logProcess(meetingId: string, step: string, status: string, message?: string, duration?: number) {
  await prisma.processLog.create({
    data: { meetingId, step, status, message, duration }
  }).catch(() => {}) // 로그 실패는 무시
}

async function updateMeetingStatus(meetingId: string, status: string, extra?: Record<string, unknown>) {
  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status, updatedAt: new Date(), ...extra }
  })
}

export async function processMeeting(meetingId: string) {
  console.log(`[처리 시작] 회의 ID: ${meetingId}`)
  
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      room: true,
      attendees: {
        include: { user: { include: { department: true } } }
      }
    }
  })

  if (!meeting) {
    throw new Error('회의를 찾을 수 없습니다.')
  }

  const attendees = meeting.attendees.map(a => ({
    name: a.user.name,
    email: a.user.email,
    department: a.user.department?.name,
    position: a.user.position || undefined,
  }))

  // ============================================================
  // Step 1: STT (음성 → 텍스트)
  // ============================================================
  await updateMeetingStatus(meetingId, 'transcribing')
  const sttStart = Date.now()
  
  let transcriptText = ''
  try {
    await logProcess(meetingId, 'transcribe', 'started')
    
    const sttProvider = createSTTProvider()
    const recordingPath = meeting.recordingPath || ''
    
    const result = await sttProvider.transcribe(recordingPath)
    transcriptText = result.text

    // 전사 결과 저장
    const transcriptDir = path.join(process.cwd(), 'uploads', 'transcripts')
    if (!fs.existsSync(transcriptDir)) fs.mkdirSync(transcriptDir, { recursive: true })
    
    const transcriptPath = path.join(transcriptDir, `${meetingId}.txt`)
    fs.writeFileSync(transcriptPath, transcriptText, 'utf-8')

    await updateMeetingStatus(meetingId, 'transcribed', {
      transcriptText,
      transcriptPath,
    })

    const sttDuration = Date.now() - sttStart
    await logProcess(meetingId, 'transcribe', 'success', `전사 완료 (${transcriptText.length}자)`, sttDuration)
    console.log(`[전사 완료] ${transcriptText.length}자`)
    
  } catch (error) {
    const errMsg = String(error)
    await updateMeetingStatus(meetingId, 'failed', { errorMessage: `전사 실패: ${errMsg}` })
    await logProcess(meetingId, 'transcribe', 'failed', errMsg)
    throw error
  }

  // ============================================================
  // Step 2: 요약 생성
  // ============================================================
  await updateMeetingStatus(meetingId, 'summarizing')
  const summaryStart = Date.now()
  
  let summaryData: SummaryData
  try {
    await logProcess(meetingId, 'summarize', 'started')
    
    const summaryProvider = createSummaryProvider()
    summaryData = await summaryProvider.summarize({
      transcript: transcriptText,
      meetingTitle: meeting.title,
      attendees,
      roomName: meeting.room.name,
      startedAt: meeting.startedAt || new Date(),
    })

    await updateMeetingStatus(meetingId, 'summarized', {
      summaryData: JSON.stringify(summaryData),
    })

    // ActionItems 저장
    if (summaryData.actionItems.length > 0) {
      await prisma.actionItem.deleteMany({ where: { meetingId } })
      for (const item of summaryData.actionItems) {
        await prisma.actionItem.create({
          data: {
            meetingId,
            assigneeName: item.assignee,
            content: item.task,
            status: item.status === 'done' ? 'done' : 'pending',
          }
        })
      }
    }

    const summaryDuration = Date.now() - summaryStart
    await logProcess(meetingId, 'summarize', 'success', '요약 생성 완료', summaryDuration)
    console.log('[요약 완료]')
    
  } catch (error) {
    const errMsg = String(error)
    await updateMeetingStatus(meetingId, 'failed', { errorMessage: `요약 실패: ${errMsg}` })
    await logProcess(meetingId, 'summarize', 'failed', errMsg)
    throw error
  }

  // ============================================================
  // Step 3: 엑셀 생성
  // ============================================================
  const excelStart = Date.now()
  let excelBuffer: Buffer
  let excelFileName: string
  
  try {
    await logProcess(meetingId, 'excel', 'started')
    
    excelBuffer = generateMeetingExcel({
      summary: summaryData!,
      transcriptText,
      meetingId,
    })

    const excelDir = path.join(process.cwd(), 'uploads', 'excel')
    if (!fs.existsSync(excelDir)) fs.mkdirSync(excelDir, { recursive: true })
    
    const safeTitle = meeting.title.replace(/[^a-zA-Z0-9가-힣\s]/g, '').replace(/\s+/g, '_')
    const dateStr = new Date().toISOString().split('T')[0]
    excelFileName = `회의록_${safeTitle}_${dateStr}.xlsx`
    const excelPath = path.join(excelDir, `${meetingId}.xlsx`)
    
    fs.writeFileSync(excelPath, excelBuffer)

    await updateMeetingStatus(meetingId, 'excel_generated', { excelPath })

    const excelDuration = Date.now() - excelStart
    await logProcess(meetingId, 'excel', 'success', '엑셀 생성 완료', excelDuration)
    console.log('[엑셀 생성 완료]')
    
  } catch (error) {
    const errMsg = String(error)
    await updateMeetingStatus(meetingId, 'failed', { errorMessage: `엑셀 생성 실패: ${errMsg}` })
    await logProcess(meetingId, 'excel', 'failed', errMsg)
    throw error
  }

  // ============================================================
  // Step 4: 메일 발송
  // ============================================================
  const emailStart = Date.now()
  
  try {
    await logProcess(meetingId, 'email', 'started')
    
    const emailProvider = createEmailProvider()
    let successCount = 0
    let failCount = 0

    for (const attendee of attendees) {
      const emailLog = await prisma.emailLog.create({
        data: {
          meetingId,
          toEmail: attendee.email,
          toName: attendee.name,
          subject: `[회의록] ${meeting.title}`,
          status: 'pending',
          provider: process.env.EMAIL_PROVIDER || 'mock',
        }
      })

      try {
        const result = await emailProvider.sendMeetingReport({
          to: attendee.email,
          toName: attendee.name,
          summary: summaryData!,
          excelBuffer: excelBuffer!,
          excelFileName: excelFileName!,
        })

        if (result.success) {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'sent', sentAt: new Date() }
          })
          successCount++
        } else {
          await prisma.emailLog.update({
            where: { id: emailLog.id },
            data: { status: 'failed', errorMsg: result.error }
          })
          failCount++
        }
      } catch (emailError) {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: 'failed', errorMsg: String(emailError) }
        })
        failCount++
      }
    }

    const finalStatus = failCount === 0 ? 'emailed' : failCount === attendees.length ? 'failed' : 'emailed'
    await updateMeetingStatus(meetingId, finalStatus)

    const emailDuration = Date.now() - emailStart
    await logProcess(meetingId, 'email', failCount === 0 ? 'success' : 'failed', 
      `발송 완료: ${successCount}명 성공, ${failCount}명 실패`, emailDuration)
    
    console.log(`[메일 발송 완료] 성공: ${successCount}, 실패: ${failCount}`)
    
  } catch (error) {
    const errMsg = String(error)
    await updateMeetingStatus(meetingId, 'failed', { errorMessage: `메일 발송 실패: ${errMsg}` })
    await logProcess(meetingId, 'email', 'failed', errMsg)
    throw error
  }

  console.log(`[처리 완료] 회의 ID: ${meetingId}`)
  return { success: true }
}

// 재시도 (특정 단계부터)
export async function retryMeeting(meetingId: string, fromStep: 'transcribe' | 'summarize' | 'excel' | 'email') {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      room: true,
      attendees: { include: { user: { include: { department: true } } } }
    }
  })

  if (!meeting) throw new Error('회의를 찾을 수 없습니다.')

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { errorMessage: null, status: 'uploaded', retryCount: { increment: 1 } }
  })

  return processMeeting(meetingId)
}
