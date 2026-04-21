import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">

        {/* 로고 + 타이틀 */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Image
              src="/wonjin-logo.png"
              alt="WONJIN Group"
              width={240}
              height={64}
              style={{ objectFit: 'contain', height: '56px', width: 'auto' }}
              priority
            />
          </div>
          <div className="w-16 h-px bg-gray-200 mx-auto mb-6" />
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-3xl">🎙️</span>
            <h1 className="text-3xl font-bold text-gray-800">회의 자동녹음/요약 시스템</h1>
          </div>
          <p className="text-gray-400 text-sm tracking-wide">
            녹음 &nbsp;→&nbsp; 전사 &nbsp;→&nbsp; 요약 &nbsp;→&nbsp; 엑셀 &nbsp;→&nbsp; 메일 자동 발송
          </p>
        </div>

        {/* 메인 카드 */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
          <Link href="/meeting" className="group">
            <div className="border-2 border-blue-100 hover:border-blue-400 bg-blue-50 hover:bg-blue-600 rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer group-hover:shadow-lg group-hover:shadow-blue-200">
              <div className="text-5xl mb-4">📹</div>
              <h2 className="text-xl font-bold text-blue-800 group-hover:text-white mb-2">회의 시작</h2>
              <p className="text-blue-500 group-hover:text-blue-100 text-sm">참석자 선택 후 녹음 시작<br />PC / 태블릿 모두 지원</p>
              <div className="mt-6">
                <span className="inline-block bg-blue-600 group-hover:bg-white text-white group-hover:text-blue-600 font-bold px-6 py-2.5 rounded-xl text-sm transition-colors duration-200">
                  회의 시작하기 →
                </span>
              </div>
            </div>
          </Link>

          <Link href="/admin" className="group">
            <div className="border-2 border-gray-100 hover:border-gray-300 bg-gray-50 hover:bg-gray-800 rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer group-hover:shadow-lg group-hover:shadow-gray-200">
              <div className="text-5xl mb-4">⚙️</div>
              <h2 className="text-xl font-bold text-gray-700 group-hover:text-white mb-2">관리자</h2>
              <p className="text-gray-400 group-hover:text-gray-300 text-sm">회의실/사용자 관리<br />회의 기록 조회 및 재처리</p>
              <div className="mt-6">
                <span className="inline-block border border-gray-300 group-hover:border-white text-gray-600 group-hover:text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors duration-200">
                  관리자 페이지 →
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* 데모 정보 */}
        <div className="border border-gray-100 bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-gray-400 text-xs">
            <span className="font-semibold text-gray-500">데모 계정:</span> admin@company.com / admin1234
            &nbsp;&nbsp;|&nbsp;&nbsp;
            <span className="font-semibold text-gray-500">현재 모드:</span> Mock (실제 API 없이 전체 흐름 테스트)
          </p>
        </div>
      </div>
    </div>
  )
}
