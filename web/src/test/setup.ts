/**
 * Shared vitest setup (#135): unmounts whatever a test rendered after each test, so no component
 * test needs its own `afterEach(cleanup)` line. The document check leaves the node-environment
 * files (the default here) untouched.
 */
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  if (typeof document !== 'undefined') cleanup()
})
