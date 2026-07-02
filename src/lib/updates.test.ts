import { describe, it, expect } from 'vitest'
import { parseVersion, isNewerVersion } from './updates'

describe('parseVersion', () => {
  it('parses plain and v-prefixed tags', () => {
    expect(parseVersion('4.0.0')).toEqual([4, 0, 0])
    expect(parseVersion('v4.1.0')).toEqual([4, 1, 0])
    expect(parseVersion('V10.2')).toEqual([10, 2])
  })

  it('ignores prerelease/build suffixes', () => {
    expect(parseVersion('4.1.0-beta.2')).toEqual([4, 1, 0])
    expect(parseVersion('v5.0.0+build7')).toEqual([5, 0, 0])
  })

  it('rejects tags without a numeric dotted core', () => {
    expect(parseVersion('latest')).toBeNull()
    expect(parseVersion('')).toBeNull()
    expect(parseVersion('v')).toBeNull()
    expect(parseVersion('4.x.0')).toBeNull()
  })
})

describe('isNewerVersion', () => {
  it('detects newer major/minor/patch', () => {
    expect(isNewerVersion('5.0.0', '4.0.0')).toBe(true)
    expect(isNewerVersion('4.1.0', '4.0.9')).toBe(true)
    expect(isNewerVersion('4.0.1', '4.0.0')).toBe(true)
  })

  it('is false for equal or older versions', () => {
    expect(isNewerVersion('4.0.0', '4.0.0')).toBe(false)
    expect(isNewerVersion('3.9.9', '4.0.0')).toBe(false)
    expect(isNewerVersion('4.0.0', '4.0.1')).toBe(false)
  })

  it('treats missing segments as zero', () => {
    expect(isNewerVersion('4.1', '4.0.9')).toBe(true)
    expect(isNewerVersion('4.0', '4.0.0')).toBe(false)
    expect(isNewerVersion('4.0.0.1', '4.0.0')).toBe(true)
  })

  it('never reports an update for unparseable input', () => {
    expect(isNewerVersion('latest', '4.0.0')).toBe(false)
    expect(isNewerVersion('5.0.0', 'garbage')).toBe(false)
  })

  it('compares numerically, not lexicographically', () => {
    expect(isNewerVersion('4.10.0', '4.9.0')).toBe(true)
    expect(isNewerVersion('10.0.0', '9.0.0')).toBe(true)
  })
})
