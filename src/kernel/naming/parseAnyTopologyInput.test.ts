// src/kernel/naming/parseAnyTopologyInput.test.ts
//
// Q7 — failing tests for the MCP-boundary dispatcher per spec §3.7. The
// dispatcher is the single entry-point every MCP tool input goes through;
// it picks the right parser by prefix and returns a unified Query value.
// Strings-as-sugar guarantee: every @kc[...] AND every @kcq[...] AND every
// JSON-AST AND every Query passthrough flows through one resolution path.

import { describe, it, expect } from 'vitest';
import { parseAnyTopologyInput } from './parseAnyTopologyInput';
import { q } from './queryConstructors';
import { KernelError } from '../../shared/intent/kernelError';

describe('parseAnyTopologyInput — MCP-boundary dispatcher (Q7)', () => {
  it('routes @kc[base/face/top] through the F-surface parser path', () => {
    const v = parseAnyTopologyInput('@kc[base/face/top]');
    expect(v._kind).toBe('kc.query');
    expect(v.target).toBe('face');
  });

  it('routes @kcq[face(createdBy("arm"))] through the @kcq[...] parser path', () => {
    const v = parseAnyTopologyInput('@kcq[face(createdBy("arm"))]');
    expect(v._kind).toBe('kc.query');
    expect(v.ast.op).toBe('entityFilter');
  });

  it('routes JSON-AST string input through the makeQuery path', () => {
    const json = JSON.stringify({
      op: 'entityFilter',
      kind: 'face',
      query: { op: 'createdBy', id: 'arm' },
    });
    const v = parseAnyTopologyInput(json);
    expect(v._kind).toBe('kc.query');
    expect(v.target).toBe('face');
  });

  it('routes JSON-AST object input through the makeQuery path', () => {
    const v = parseAnyTopologyInput({
      ast: { op: 'everything', kind: 'face' },
    });
    expect(v._kind).toBe('kc.query');
    expect(v.target).toBe('face');
  });

  it('passes Query values through unchanged (object form, not string)', () => {
    const direct = q.face(q.createdBy('arm'));
    const echo = parseAnyTopologyInput(direct);
    expect(echo).toBe(direct);
  });

  it('throws query.invalid-syntax on string input that matches neither form', () => {
    expect.assertions(2);
    try {
      parseAnyTopologyInput('not-a-ref');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });

  it('throws query.invalid-syntax on a malformed @kc[...] ref', () => {
    expect.assertions(2);
    try {
      parseAnyTopologyInput('@kc[base/badkind/top]');
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });

  it('throws query.invalid-syntax on a non-string non-object input', () => {
    expect.assertions(2);
    try {
      parseAnyTopologyInput(42 as never);
    } catch (e) {
      expect(e).toBeInstanceOf(KernelError);
      expect((e as KernelError).code).toBe('query.invalid-syntax');
    }
  });
});
