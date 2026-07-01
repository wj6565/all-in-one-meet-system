// 이 파일을 복사해서 ecosystem.config.cjs 로 만드세요
// cp ecosystem.config.example.cjs ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'meeting-system',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/user/webapp',
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        AUTH_TRUST_HOST: '1',
        // ↓ sandbox URL 바뀔 때마다 여기 수정
        NEXTAUTH_URL: 'https://3000-XXXXXX-8f57ffe2.sandbox.novita.ai',
        NEXTAUTH_SECRET: 'integrated-meet-system-secret-2026',
        DATABASE_URL: 'file:/home/user/webapp/dev.db',
        // OpenAI 실제 사용 시 아래 설정
        STT_PROVIDER: 'openai',       // 'mock' 또는 'openai'
        SUMMARY_PROVIDER: 'openai',   // 'mock' 또는 'openai'
        EMAIL_PROVIDER: 'mock',
        OPENAI_API_KEY: 'sk-proj-여기에붙여넣기',
        OPENAI_MODEL: 'gpt-4o-mini',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
    }
  ]
}
