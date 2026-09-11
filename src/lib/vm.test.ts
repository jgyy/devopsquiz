import { describe, expect, it } from 'vitest'
import { isVmSupported, makePromptDetector } from './vm'

const feed = (detect: (b: number) => boolean, text: string) => [...text].map((c) => detect(c.charCodeAt(0)))

describe('makePromptDetector', () => {
  it('fires once when the prompt first appears', () => {
    const detect = makePromptDetector('~% ')
    const hits = feed(detect, 'Welcome to Buildroot\r\n~% ')
    expect(hits.filter(Boolean)).toHaveLength(1)
    expect(hits.at(-1)).toBe(true)
  })

  it('does not fire on partial matches and never fires twice', () => {
    const detect = makePromptDetector('~% ')
    expect(feed(detect, '~%x~%').some(Boolean)).toBe(false)
    expect(feed(detect, ' ').at(-1)).toBe(true)
    expect(feed(detect, '~% ~% ').some(Boolean)).toBe(false)
  })
})

describe('isVmSupported', () => {
  it('is true in an environment with WebAssembly', () => {
    expect(isVmSupported()).toBe(true)
  })
})
