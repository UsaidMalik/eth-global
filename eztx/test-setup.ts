import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Extend Vitest's expect with jest-dom matchers
expect.extend(require('@testing-library/jest-dom/matchers'))

// Cleanup after each test
afterEach(() => {
  cleanup()
})