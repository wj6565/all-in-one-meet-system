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
        NEXTAUTH_URL: 'https://3000-i4pi6rrcm7l5axgphqno8-8f57ffe2.sandbox.novita.ai',
        NEXTAUTH_SECRET: 'integrated-meet-system-secret-2026',
        DATABASE_URL: 'file:/home/user/webapp/dev.db',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
    }
  ]
}
