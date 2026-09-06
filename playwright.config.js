import { defineConfig } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.BRACKETCANVAS_TEST_DB ||= join(mkdtempSync(join(tmpdir(), 'bracketcanvas-i18n-')), 'test.sqlite')

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5175', locale: 'fr-FR', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'node server/index.js',
      url: 'http://localhost:3101/api/health',
      env: {
        PORT: '3101', NODE_ENV: 'development', DATABASE_PATH: process.env.BRACKETCANVAS_TEST_DB,
        PUBLIC_APP_URL: 'http://localhost:5175', SMTP_HOST: '', ADMIN_EMAILS: 'i18n-admin@example.test',
        ALLOWED_ORIGINS: 'http://localhost:5175',
      },
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://localhost:5175',
      env: { BRACKETCANVAS_DEV_API_URL: 'http://localhost:3101' },
    },
  ],
})
