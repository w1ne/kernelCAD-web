// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { GenerateEvent } from './generateClient';
import { liveCodeHeading, liveCodeOf, reduceLiveCode } from './liveCode';

const code = (attempt: number, delta: string, reset?: boolean): GenerateEvent =>
  ({ kind: 'code', attempt, delta, ...(reset ? { reset: true } : {}) });
const done = (finalCode: string): GenerateEvent => ({
  kind: 'done',
  artifact: { title: 'T', code: finalCode, parameters: [], suggestions: [] },
  generationId: 'g',
  anonId: 'a',
  durationMs: 1,
});

describe('reduceLiveCode', () => {
  it('stays null without code events (an older server)', () => {
    expect(liveCodeOf([{ kind: 'status', phase: 'running' }, { kind: 'progress', stage: 'planning', message: 'p', elapsedMs: 0 }])).toBeNull();
  });

  it('appends chunks to the current buffer', () => {
    expect(liveCodeOf([code(1, '', true), code(1, 'const a'), code(1, ' = 1;')]))
      .toEqual({ attempt: 1, code: 'const a = 1;', final: false });
  });

  it('starts a buffer from the first chunk even without reset', () => {
    expect(liveCodeOf([code(1, 'abc')])).toEqual({ attempt: 1, code: 'abc', final: false });
  });

  it('reset starts over within the same attempt', () => {
    expect(liveCodeOf([code(1, 'old'), code(1, 'new', true), code(1, '!')]))
      .toEqual({ attempt: 1, code: 'new!', final: false });
  });

  it('a new attempt replaces the previous buffer, with or without reset', () => {
    expect(liveCodeOf([code(1, 'first try'), code(2, 'fix', true), code(2, 'ed')]))
      .toEqual({ attempt: 2, code: 'fixed', final: false });
    expect(liveCodeOf([code(1, 'first try'), code(2, 'second')]))
      .toEqual({ attempt: 2, code: 'second', final: false });
  });

  it('an empty append keeps the same state object', () => {
    const s = reduceLiveCode(null, code(1, 'a'));
    expect(reduceLiveCode(s, code(1, ''))).toBe(s);
  });

  it('done replaces the buffer with the final artifact code', () => {
    expect(liveCodeOf([code(2, 'half', true), done('return box(1,1,1);')]))
      .toEqual({ attempt: 2, code: 'return box(1,1,1);', final: true });
  });

  it('ignores events that carry no code', () => {
    const s = reduceLiveCode(null, code(1, 'a'));
    expect(reduceLiveCode(s, { kind: 'tool_call', name: 'evaluate', args: {} })).toBe(s);
  });
});

describe('liveCodeHeading', () => {
  it('names the first write, a fix attempt and the final script', () => {
    expect(liveCodeHeading({ attempt: 1, code: '', final: false })).toBe('Writing the script');
    expect(liveCodeHeading({ attempt: 2, code: '', final: false })).toBe('Attempt 2 — fixing');
    expect(liveCodeHeading({ attempt: 3, code: '', final: true })).toBe('Final script');
  });
});
