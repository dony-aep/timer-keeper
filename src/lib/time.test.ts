import { describe, it, expect } from 'vitest'
import { formatTime, parseFormattedTime, formatDescriptive, dayKey } from './time'

describe('formatTime', () => {
  it('formats zero', () => {
    expect(formatTime(0)).toBe('00:00:00')
  })

  it('zero-pads hours, minutes, seconds', () => {
    expect(formatTime(3661)).toBe('01:01:01')
    expect(formatTime(90)).toBe('00:01:30')
  })

  it('does not cap hours beyond 24', () => {
    expect(formatTime(90000)).toBe('25:00:00') // 25h
    expect(formatTime(360000)).toBe('100:00:00') // 100h stays 3 digits, no leading zero pad
  })

  it('floors fractional seconds', () => {
    expect(formatTime(5.9)).toBe('00:00:05')
  })

  it('clamps invalid / negative input to zero', () => {
    expect(formatTime(-10)).toBe('00:00:00')
    expect(formatTime(NaN)).toBe('00:00:00')
    expect(formatTime(Infinity)).toBe('00:00:00')
  })
})

describe('parseFormattedTime', () => {
  it('parses valid HH:MM:SS', () => {
    expect(parseFormattedTime('01:01:01')).toBe(3661)
    expect(parseFormattedTime('00:01:30')).toBe(90)
  })

  it('parses hours beyond 24', () => {
    expect(parseFormattedTime('25:00:00')).toBe(90000)
  })

  it('returns 0 for wrong part count', () => {
    expect(parseFormattedTime('1:2')).toBe(0)
    expect(parseFormattedTime('01:02:03:04')).toBe(0)
    expect(parseFormattedTime('')).toBe(0)
  })

  it('returns 0 for non-numeric parts', () => {
    expect(parseFormattedTime('aa:bb:cc')).toBe(0)
    expect(parseFormattedTime('ab')).toBe(0)
  })

  it('returns 0 for non-string input', () => {
    expect(parseFormattedTime(null as unknown as string)).toBe(0)
    expect(parseFormattedTime(123 as unknown as string)).toBe(0)
  })

  it('round-trips with formatTime', () => {
    expect(parseFormattedTime(formatTime(3661))).toBe(3661)
    expect(parseFormattedTime(formatTime(90000))).toBe(90000)
  })
})

describe('formatDescriptive', () => {
  it('always shows minutes and seconds', () => {
    expect(formatDescriptive(30)).toBe('0 mins, 30 secs')
    expect(formatDescriptive(90)).toBe('1 mins, 30 secs')
  })

  it('adds hours when present', () => {
    expect(formatDescriptive(3661)).toBe('1 hrs, 1 mins, 1 secs')
  })

  it('adds days (and forces hours) when present', () => {
    expect(formatDescriptive(90061)).toBe('1 days, 1 hrs, 1 mins, 1 secs')
    expect(formatDescriptive(86400)).toBe('1 days, 0 hrs, 0 mins, 0 secs')
  })

  it('clamps invalid input to zero', () => {
    expect(formatDescriptive(-5)).toBe('0 mins, 0 secs')
    expect(formatDescriptive(NaN)).toBe('0 mins, 0 secs')
  })
})

describe('dayKey', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    // Constructed with local components -> no timezone drift.
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('zero-pads month and day', () => {
    expect(dayKey(new Date(2026, 6, 1))).toBe('2026-07-01')
  })
})
