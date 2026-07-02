import { describe, it, expect } from 'vitest'
import { escapeForEval } from './useCSInterface'

// Built via fromCharCode so this source file stays pure ASCII (no invisible literals).
const LS = String.fromCharCode(0x2028) // U+2028 line separator
const PS = String.fromCharCode(0x2029) // U+2029 paragraph separator

describe('escapeForEval', () => {
  it('passes plain paths through untouched (spaces included)', () => {
    expect(escapeForEval('C:/projects/my project.aep')).toBe('C:/projects/my project.aep')
  })

  it('escapes backslashes (Windows paths)', () => {
    expect(escapeForEval('C:\\projects\\file.aep')).toBe('C:\\\\projects\\\\file.aep')
  })

  it('escapes single quotes', () => {
    expect(escapeForEval("dony's project.aep")).toBe("dony\\'s project.aep")
  })

  it('escapes newlines and carriage returns', () => {
    expect(escapeForEval('line1\nline2\rline3')).toBe('line1\\nline2\\rline3')
  })

  it('escapes U+2028 / U+2029 (would terminate the evaluated string literal)', () => {
    expect(escapeForEval('a' + LS + 'b' + PS + 'c')).toBe('a\\u2028b\\u2029c')
  })

  it('escapes backslashes before quotes (order matters)', () => {
    // A pre-escaped quote must not be double-processed into a broken sequence.
    expect(escapeForEval("\\'")).toBe("\\\\\\'")
  })

  it('round-trips through eval to the original string', () => {
    const nasty = "C:\\a's\nb\r" + LS + PS + 'end'
    // Simulates what the host receives: a single-quoted JS string literal.
    expect(eval("'" + escapeForEval(nasty) + "'")).toBe(nasty)
  })
})
