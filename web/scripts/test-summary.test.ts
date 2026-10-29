import { describe, expect, it } from 'vitest'
import { summarize, type VitestJson } from './test-summary'

const green: VitestJson = {
  numPassedTests: 3,
  numFailedTests: 0,
  testResults: [{ name: '/x/web/src/a.test.ts', status: 'passed', assertionResults: [{ fullName: 'a works', status: 'passed' }] }],
}

describe('the test summary', () => {
  it('is one line when everything passed', () => {
    expect(summarize('unit', green)).toEqual(['unit: 3 passed, 0 failed (1 files)'])
  })

  it('names each failed test after the counts, with the path relative to web/', () => {
    const red: VitestJson = {
      numPassedTests: 1,
      numFailedTests: 1,
      testResults: [{ name: '/x/web/src/b.test.ts', status: 'failed', assertionResults: [{ fullName: 'b > breaks', status: 'failed' }, { fullName: 'b > holds', status: 'passed' }] }],
    }
    expect(summarize('unit', red)).toEqual(['unit: 1 passed, 1 failed (1 files)', '  FAIL src/b.test.ts > b > breaks'])
  })

  it('names a suite that could not load, with the first line of its message', () => {
    const broken: VitestJson = { numPassedTests: 0, numFailedTests: 0, testResults: [{ name: '/x/web/src/c.test.ts', status: 'failed', message: 'Cannot find module\nat ...' }] }
    expect(summarize('unit', broken)).toEqual(['unit: 0 passed, 0 failed (1 files)', '  FAIL src/c.test.ts: Cannot find module'])
  })
})
