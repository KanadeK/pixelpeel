import { defineConfig, devices } from '@playwright/test'

const host = '127.0.0.1'
const port = 5173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'test-results',
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: `http://${host}:${port}/pixelpeel/`,
    ...devices['Desktop Chrome'],
    permissions: ['clipboard-read', 'clipboard-write'],
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: `http://${host}:${port}/pixelpeel/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
