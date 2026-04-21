'use client'

import { useState, useEffect } from 'react'

interface Settings {
  emailFromName: string
  emailFromAddress: string
  sttProvider: string
  summaryProvider: string
  emailProvider: string
  recordingConsent: string
  retentionDays: string
  emailSubjectTemplate: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    emailFromName: '회의록 시스템',
    emailFromAddress: 'noreply@company.com',
    sttProvider: 'mock',
    summaryProvider: 'mock',
    emailProvider: 'mock',
    recordingConsent: '본 회의는 회의록 작성을 위해 자동으로 녹음됩니다.',
    retentionDays: '365',
    emailSubjectTemplate: '[회의록] {title} - {date}',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => { setSettings(s => ({ ...s, ...data })); setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="text-center py-16 text-slate-400">로딩 중...</div>

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">시스템 설정</h1>
        <p className="text-slate-500 mt-1">API 연동 및 시스템 설정을 관리합니다</p>
      </div>

      <div className="space-y-6">
        {/* Provider 설정 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-1">🔧 Provider 설정</h2>
          <p className="text-slate-400 text-sm mb-5">실제 API 연동 전에는 Mock을 사용하세요</p>

          <div className="space-y-4">
            <ProviderSelect
              label="STT (음성 인식) Provider"
              value={settings.sttProvider}
              onChange={v => setSettings(s => ({ ...s, sttProvider: v }))}
              options={[
                { value: 'mock', label: 'Mock (테스트용) - API 키 불필요' },
                { value: 'openai', label: 'OpenAI Whisper - .env에 OPENAI_API_KEY 필요' },
                { value: 'azure', label: 'Azure Speech - .env에 AZURE_SPEECH_KEY 필요' },
                { value: 'clova', label: 'Naver Clova - .env에 CLOVA_STT_* 필요' },
              ]}
            />
            <ProviderSelect
              label="요약 AI Provider"
              value={settings.summaryProvider}
              onChange={v => setSettings(s => ({ ...s, summaryProvider: v }))}
              options={[
                { value: 'mock', label: 'Mock (테스트용) - API 키 불필요' },
                { value: 'openai', label: 'OpenAI GPT - .env에 OPENAI_API_KEY 필요' },
                { value: 'claude', label: 'Anthropic Claude - .env에 ANTHROPIC_API_KEY 필요' },
              ]}
            />
            <ProviderSelect
              label="메일 발송 Provider"
              value={settings.emailProvider}
              onChange={v => setSettings(s => ({ ...s, emailProvider: v }))}
              options={[
                { value: 'mock', label: 'Mock (테스트용) - 실제 발송 안됨' },
                { value: 'smtp', label: 'SMTP (Gmail, 회사메일) - .env에 SMTP_* 필요' },
                { value: 'sendgrid', label: 'SendGrid - .env에 SENDGRID_API_KEY 필요' },
                { value: 'resend', label: 'Resend - .env에 RESEND_API_KEY 필요' },
              ]}
            />
          </div>
        </section>

        {/* 메일 설정 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-5">📧 메일 발신 설정</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">발신자 이름</label>
              <input value={settings.emailFromName}
                onChange={e => setSettings(s => ({ ...s, emailFromName: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="회의록 시스템" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">발신 이메일 주소</label>
              <input value={settings.emailFromAddress}
                onChange={e => setSettings(s => ({ ...s, emailFromAddress: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="noreply@company.com" />
              <p className="text-xs text-slate-400 mt-1">실제 메일 발송 시 이 주소가 발신자로 표시됩니다</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">메일 제목 템플릿</label>
              <input value={settings.emailSubjectTemplate}
                onChange={e => setSettings(s => ({ ...s, emailSubjectTemplate: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="[회의록] {title} - {date}" />
              <p className="text-xs text-slate-400 mt-1">{'{title}'} = 회의명, {'{date}'} = 날짜</p>
            </div>
          </div>
        </section>

        {/* 녹음 동의 문구 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-5">📜 녹음 안내 문구</h2>
          <textarea value={settings.recordingConsent}
            onChange={e => setSettings(s => ({ ...s, recordingConsent: e.target.value }))}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            rows={4}
            placeholder="녹음 안내 문구를 입력하세요" />
          <p className="text-xs text-slate-400 mt-1">회의 시작 화면에 표시됩니다</p>
        </section>

        {/* 데이터 보관 */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-800 mb-5">🗂️ 데이터 보관 설정</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">녹음/데이터 보관 기간 (일)</label>
            <input value={settings.retentionDays}
              onChange={e => setSettings(s => ({ ...s, retentionDays: e.target.value }))}
              type="number" min="1" max="3650"
              className="w-40 px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">설정된 기간 이후 녹음 파일이 자동 삭제됩니다 (자동삭제 스케줄러 별도 설정 필요)</p>
          </div>
        </section>

        {/* .env 안내 */}
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="font-bold text-amber-800 mb-3">⚠️ 실제 API 연동 시 .env 파일 설정 필요</h2>
          <p className="text-amber-700 text-sm mb-3">
            위 Provider를 Mock 이외로 변경한 경우, 서버의 <code className="bg-amber-100 px-1 rounded">.env</code> 파일에 API 키를 설정해야 합니다.
          </p>
          <div className="bg-white rounded-xl p-4 font-mono text-xs text-slate-600 space-y-1">
            <div className="text-slate-400"># STT - OpenAI</div>
            <div>OPENAI_API_KEY=sk-...</div>
            <div className="text-slate-400 mt-2"># 메일 - SMTP</div>
            <div>SMTP_HOST=smtp.gmail.com</div>
            <div>SMTP_USER=your@gmail.com</div>
            <div>SMTP_PASSWORD=your-app-password</div>
            <div className="text-slate-400 mt-2"># 메일 - SendGrid</div>
            <div>SENDGRID_API_KEY=SG....</div>
            <div className="text-slate-400 mt-2"># Provider 선택</div>
            <div>STT_PROVIDER=openai</div>
            <div>SUMMARY_PROVIDER=openai</div>
            <div>EMAIL_PROVIDER=smtp</div>
          </div>
        </section>

        {/* 저장 버튼 */}
        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-xl transition-colors">
            {saving ? '저장 중...' : '설정 저장'}
          </button>
          {saved && <span className="text-green-600 font-medium">✓ 저장되었습니다</span>}
        </div>
      </div>
    </div>
  )
}

function ProviderSelect({ label, value, onChange, options }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
