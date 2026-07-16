import { expect, test as base } from '@playwright/test'

type BrowserErrors = {
  console: string[]
  page: string[]
}

type Fixtures = {
  browserErrors: BrowserErrors
}

export const test = base.extend<Fixtures>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: BrowserErrors = { console: [], page: [] }

      page.on('console', (message) => {
        if (message.type() === 'error') {
          errors.console.push(message.text())
        }
      })
      page.on('pageerror', (error) => errors.page.push(error.message))

      await use(errors)

      expect(errors.console, 'Unexpected browser console errors').toEqual([])
      expect(errors.page, 'Unexpected uncaught page errors').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }
