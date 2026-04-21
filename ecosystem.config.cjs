module.exports = {
  apps: [
    {
      name: 'meeting-system',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        AUTH_TRUST_HOST: '1',
        NEXTAUTH_URL: 'https://3000-ijs4eutws43johl4tqboy-de59bda9.sandbox.novita.ai',
        NEXTAUTH_SECRET: 'integrated-meet-system-secret-2026',
        DATABASE_URL: 'file:/home/user/webapp/dev.db',
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    }
  ]
}
