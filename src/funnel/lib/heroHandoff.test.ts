// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { MAX_QUERY_PROMPT, parseGenerateQuery, shouldAutoSubmit } from './heroHandoff';

describe('shouldAutoSubmit', () => {
  it('accepts the marketing site origin with and without www, any path', () => {
    expect(shouldAutoSubmit('1', 'https://kernelcad.com/')).toBe(true);
    expect(shouldAutoSubmit('1', 'https://www.kernelcad.com/pricing?x=1')).toBe(true);
  });

  it('rejects an empty or missing referrer', () => {
    expect(shouldAutoSubmit('1', '')).toBe(false);
    expect(shouldAutoSubmit('1', null)).toBe(false);
    expect(shouldAutoSubmit('1', undefined)).toBe(false);
  });

  it('rejects other origins, lookalikes, wrong scheme and other ports', () => {
    for (const ref of [
      'https://app.kernelcad.com/',
      'https://evil.com/?https://kernelcad.com/',
      'https://kernelcad.com.evil.com/',
      'https://evilkernelcad.com/',
      'http://kernelcad.com/',
      'https://kernelcad.com:8443/',
      'https://user@evil.com@kernelcad.com.evil.com/',
      'not a url',
    ]) {
      expect(shouldAutoSubmit('1', ref), ref).toBe(false);
    }
  });

  it('needs auto=1 exactly', () => {
    expect(shouldAutoSubmit(null, 'https://kernelcad.com/')).toBe(false);
    expect(shouldAutoSubmit('', 'https://kernelcad.com/')).toBe(false);
    expect(shouldAutoSubmit('true', 'https://kernelcad.com/')).toBe(false);
    expect(shouldAutoSubmit('0', 'https://kernelcad.com/')).toBe(false);
  });
});

describe('parseGenerateQuery', () => {
  it('reads and trims q', () => {
    expect(parseGenerateQuery('?q=%20a%20bracket%20%20&auto=1')).toEqual({ prompt: 'a bracket', auto: '1', hadParams: true });
  });

  it('caps q at the limit', () => {
    const long = 'x'.repeat(MAX_QUERY_PROMPT + 50);
    expect(parseGenerateQuery(`?q=${long}`).prompt).toHaveLength(MAX_QUERY_PROMPT);
  });

  it('falls back to the older prompt param, and to an empty string', () => {
    expect(parseGenerateQuery('?prompt=hex%20bolt').prompt).toBe('hex bolt');
    expect(parseGenerateQuery('').prompt).toBe('');
    expect(parseGenerateQuery('?q=').prompt).toBe('');
  });

  it('reports whether there were handoff params to strip', () => {
    expect(parseGenerateQuery('?foo=1').hadParams).toBe(false);
    expect(parseGenerateQuery('?auto=1').hadParams).toBe(true);
  });
});
