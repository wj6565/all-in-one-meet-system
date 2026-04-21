// Service Worker for ALL IN ONE MEET SYSTEM PWA
const CACHE_NAME = 'meet-system-v1'
const STATIC_CACHE = 'meet-static-v1'

// 캐시할 정적 자원
const STATIC_ASSETS = [
  '/manifest.json',
  '/wonjin-logo.png',
]

// 설치
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

// 활성화
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== STATIC_CACHE)
          .map(name => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// 네트워크 요청 처리
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API 요청은 항상 네트워크 우선
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: '오프라인 상태입니다' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      })
    )
    return
  }

  // 정적 자산은 캐시 우선
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok && !url.pathname.startsWith('/api/')) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        }).catch(() => {
          // 오프라인 폴백
          return caches.match('/') || new Response('오프라인 상태입니다', { status: 503 })
        })
      })
    )
  }
})

// 백그라운드 동기화 (예약 알림 등)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
