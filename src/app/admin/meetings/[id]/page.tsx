'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '준비중', color: 'bg-slate-100 text-slate-600' },
  recording: { label: '🔴 녹음중', color: 'bg-red-100 text-red-700' },
  uploaded: { label: '업로드됨', color: 'bg-yellow-100 text-yellow-700' },
  transcribing: { label: '⏳ 전사중', color: 'bg-blue-100 text-blue-700' },
  transcribed: { label: '전사완료', color: 'bg-blue-100 text-blue-700' },
  summarizing: { label: '⏳ 요약중', color: 'bg-purple-100 text-purple-700' },
  summarized: { label: '요약완료', color: 'bg-purple-100 text-purple-700' },
  excel_generated: { label: '엑셀완료', color: 'bg-teal-100 text-teal-700' },
  emailed: { label: '✅ 발송완료', color: 'bg-green-100 text-green-700' },
  failed: { label: '❌ 실패', color: 'bg-red-100 text-red-700' },
}

interface MeetingDetail {
  id: string
  title: string
  status: string
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  recordingPath: string | null
  recordingDuration: number | null
  recordingSize: number | null
  transcriptText: string | null
  summaryData: string | null
  errorMessage: string | null
  retryCount: number
  room: { name: string; location: string | null }
  attendees: Array<{ user: { name: string; email: string; position: string | null; department: { name: string } | null } }>
  emailLogs: Array<{ id: string; toEmail: string; toName: string | null; status: string; sentAt: string | null; errorMsg: string | null; provider: string | null }>
  actionItems: Array<{ id: string; assigneeName: string | null; content: string; dueDate: string | null; status: string }>
  processLogs: Array<{ id: string; step: string; status: string; message: string | null; duration: number | null; createdAt: string }>
}

export default function MeetingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'logs'>('summary')

  const loadMeeting = async () => {
    const res = await fetch(`/api/admin/meetings/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setMeeting(data)
    setLoading(false)
  }

  useEffect(() => { loadMeeting() }, [id])

  const handleAction = async (actionName: string) => {
    if (!confirm(`${actionName === 'retry' ? '재처리' : '메일 재발송'}하시겠습니까?`)) return
    setAction(actionName)
    const res = await fetch(`/api/admin/meetings/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: actionName }),
    })
    const data = await res.json()
    alert(data.message || (res.ok ? '완료' : '실패'))
    setAction(null)
    loadMeeting()
  }

  if (loading) return <div className="text-center py-16 text-slate-400">로딩 중...</div>
  if (!meeting) return <div className="text-center py-16 text-red-500">회의를 찾을 수 없습니다.</div>

  const summaryData = meeting.summaryData ? JSON.parse(meeting.summaryData) : null
  const statusInfo = STATUS_LABELS[meeting.status] || { label: meeting.status, color: 'bg-slate-100' }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-600 text-sm">← 목록</button>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{meeting.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="text-slate-400 text-sm">🏢 {meeting.room.name}</span>
            {meeting.startedAt && (
              <span className="text-slate-400 text-sm">📅 {new Date(meeting.startedAt).toLocaleString('ko-KR')}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {meeting.recordingPath && (
            <a href={`/api/download/recording/${meeting.id}`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm font-medium transition-colors">
              🎙️ 녹음 다운로드
            </a>
          )}
          {['emailed', 'excel_generated', 'summarized'].includes(meeting.status) && (
            <a href={`/api/download/excel/${meeting.id}`}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors">
              📥 엑셀 다운로드
            </a>
          )}
          {meeting.transcriptText && (
            <a href={`/api/download/transcript/${meeting.id}`}
              className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors">
              📄 전사 다운로드
            </a>
          )}
          {meeting.status === 'failed' && (
            <button onClick={() => handleAction('retry')} disabled={!!action}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-xl text-sm font-medium transition-colors">
              {action === 'retry' ? '처리중...' : '🔄 재처리'}
            </button>
          )}
          {['emailed', 'excel_generated'].includes(meeting.status) && (
            <button onClick={() => handleAction('resend-email')} disabled={!!action}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-medium transition-colors">
              {action === 'resend-email' ? '발송중...' : '📧 메일 재발송'}
            </button>
          )}
        </div>
      </div>

      {/* 오류 메시지 */}
      {meeting.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <div className="text-red-700 font-medium text-sm mb-1">⚠️ 처리 오류</div>
          <div className="text-red-600 text-sm">{meeting.errorMessage}</div>
          {meeting.retryCount > 0 && (
            <div className="text-red-400 text-xs mt-1">재시도: {meeting.retryCount}회</div>
          )}
        </div>
      )}

      {/* 기본 정보 카드들 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <InfoCard label="참석자" value={`${meeting.attendees.length}명`} icon="👥" />
        <InfoCard label="녹음 시간" value={meeting.recordingDuration ? `${Math.floor(meeting.recordingDuration / 60)}분 ${meeting.recordingDuration % 60}초` : '-'} icon="🎙️" />
        <InfoCard label="파일 크기" value={meeting.recordingSize ? `${(meeting.recordingSize / 1024 / 1024).toFixed(1)} MB` : '-'} icon="💾" />
        <InfoCard label="메일 발송" value={`${meeting.emailLogs.filter(e => e.status === 'sent').length}/${meeting.emailLogs.length}명`} icon="📧" />
      </div>

      {/* 탭 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
        <div className="flex border-b border-slate-200">
          {(['summary', 'transcript', 'logs'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab === 'summary' ? '📋 요약' : tab === 'transcript' ? '📝 전사' : '📊 처리 로그'}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* 요약 탭 */}
          {activeTab === 'summary' && (
            <div>
              {/* 참석자 */}
              <section className="mb-6">
                <h3 className="font-bold text-slate-700 mb-3">참석자</h3>
                <div className="flex flex-wrap gap-2">
                  {meeting.attendees.map(a => (
                    <div key={a.user.email} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <div className="font-medium text-slate-800 text-sm">{a.user.name}</div>
                      <div className="text-xs text-slate-400">{a.user.department?.name} {a.user.position}</div>
                    </div>
                  ))}
                </div>
              </section>

              {summaryData && (
                <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
                  <div>
                    <div className="text-amber-800 font-semibold text-sm">현재 Mock(테스트) 모드입니다</div>
                    <div className="text-amber-700 text-xs mt-0.5">
                      아래 요약 내용은 <strong>실제 녹음 내용이 아닌 샘플 데이터</strong>입니다.
                      실제 녹음 파일은 우측 상단 <strong>🎙️ 녹음 다운로드</strong> 버튼으로 받을 수 있습니다.
                    </div>
                  </div>
                </div>
              )}
              {summaryData ? (
                <>
                  <section className="mb-6">
                    <h3 className="font-bold text-slate-700 mb-2">회의 주요 내용</h3>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {summaryData.mainContent}
                    </div>
                  </section>
                  {summaryData.decisions?.length > 0 && (
                    <section className="mb-6">
                      <h3 className="font-bold text-slate-700 mb-2">결정사항</h3>
                      <ul className="space-y-2">
                        {summaryData.decisions.map((d: string, i: number) => (
                          <li key={i} className="flex gap-2 text-sm text-slate-700">
                            <span className="text-green-500 font-bold mt-0.5">✓</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {meeting.actionItems.length > 0 && (
                    <section className="mb-6">
                      <h3 className="font-bold text-slate-700 mb-3">후속 조치 (Action Items)</h3>
                      <div className="space-y-2">
                        {meeting.actionItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                            <span className="text-sm font-medium text-slate-700 min-w-20">{item.assigneeName || '-'}</span>
                            <span className="text-sm text-slate-600 flex-1">{item.content}</span>
                            {item.dueDate && <span className="text-xs text-slate-400">{item.dueDate}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {item.status === 'done' ? '완료' : '대기'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  {summaryData.pendingIssues?.length > 0 && (
                    <section className="mb-6">
                      <h3 className="font-bold text-slate-700 mb-2">미결 이슈</h3>
                      <ul className="space-y-1">
                        {summaryData.pendingIssues.map((i: string, idx: number) => (
                          <li key={idx} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-orange-500">•</span>{i}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {summaryData.nextSteps?.length > 0 && (
                    <section>
                      <h3 className="font-bold text-slate-700 mb-2">다음 단계</h3>
                      <ul className="space-y-1">
                        {summaryData.nextSteps.map((s: string, i: number) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-blue-500">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  {meeting.status === 'recording' ? '녹음 중입니다...' :
                   meeting.status === 'uploaded' ? '분석 대기 중입니다...' :
                   meeting.status === 'transcribing' ? '전사 중입니다...' :
                   meeting.status === 'summarizing' ? '요약 생성 중입니다...' :
                   '요약 결과가 없습니다.'}
                </div>
              )}
            </div>
          )}

          {/* 전사 탭 */}
          {activeTab === 'transcript' && (
            <div>
              {/* Mock 모드 안내 */}
              <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
                <div>
                  <div className="text-amber-800 font-semibold text-sm">현재 Mock(테스트) 모드입니다</div>
                  <div className="text-amber-700 text-xs mt-0.5">
                    아래 전사 결과는 <strong>실제 녹음 내용이 아닌 샘플 텍스트</strong>입니다.
                    실제 STT 사용을 위해서는 OpenAI Whisper 등 API 키 설정이 필요합니다.
                    실제 녹음 파일은 우측 상단 <strong>🎙️ 녹음 다운로드</strong> 버튼으로 받을 수 있습니다.
                  </div>
                </div>
              </div>
              {meeting.transcriptText ? (
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-mono">
                  {meeting.transcriptText}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">전사 결과가 없습니다.</div>
              )}
            </div>
          )}

          {/* 처리 로그 탭 */}
          {activeTab === 'logs' && (
            <div>
              {/* 메일 발송 이력 */}
              {meeting.emailLogs.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-slate-700 mb-3">메일 발송 이력</h3>
                  <div className="space-y-2">
                    {meeting.emailLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                        <span className="font-medium text-slate-700">{log.toName || log.toEmail}</span>
                        <span className="text-slate-400 text-xs">{log.toEmail}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {log.sentAt ? new Date(log.sentAt).toLocaleString('ko-KR') : log.status}
                        </span>
                        {log.errorMsg && <span className="text-red-500 text-xs">{log.errorMsg}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 처리 단계 로그 */}
              <div>
                <h3 className="font-bold text-slate-700 mb-3">처리 단계 로그</h3>
                {meeting.processLogs.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-sm">처리 로그가 없습니다.</div>
                ) : (
                  <div className="space-y-2">
                    {meeting.processLogs.map(log => (
                      <div key={log.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="font-medium text-slate-700 min-w-24">{log.step}</span>
                        <span className="text-slate-500">{log.message}</span>
                        <span className="ml-auto text-xs text-slate-400">
                          {log.duration ? `${(log.duration / 1000).toFixed(1)}초` : ''} {new Date(log.createdAt).toLocaleTimeString('ko-KR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="font-bold text-slate-800">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}
