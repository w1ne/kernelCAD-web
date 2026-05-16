// tests/unit/runtime/session.warnings.test.ts
//
// Phase-1 unit tests for the session-scoped soft-warning log.
// Phase 4 will wire emission paths; this phase verifies the log + drain mechanics.

import { describe, it, expect } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import type { SoftWarning } from '../../../src/shared/runtime/softWarning';

const sample: SoftWarning = {
  code: 'feature.face-ref.not-resolvable',
  hint: 'face-ref.skipped-by-param',
  message: "feature 'cablePort' gated off by param 'addCablePort'",
  recordId: 'fillet-1',
  paramName: 'addCablePort',
  phase: 'update',
};

describe('CaptureSession.warnings', () => {
  it('starts empty', () => {
    const s = new CaptureSession();
    expect(s.warnings).toHaveLength(0);
  });

  it('append + read', () => {
    const s = new CaptureSession();
    s.warnings.push(sample);
    expect(s.warnings).toHaveLength(1);
    expect(s.warnings[0].hint).toBe('face-ref.skipped-by-param');
  });

  it('consumeWarnings drains and returns the log', () => {
    const s = new CaptureSession();
    s.warnings.push(sample);
    s.warnings.push({ ...sample, recordId: 'fillet-2' });
    const drained = s.consumeWarnings();
    expect(drained).toHaveLength(2);
    expect(s.warnings).toHaveLength(0);
  });

  it('consumeWarnings on empty log returns empty array', () => {
    const s = new CaptureSession();
    expect(s.consumeWarnings()).toEqual([]);
  });

  it('reset clears warnings (along with records and paramTable)', () => {
    const s = new CaptureSession();
    s.warnings.push(sample);
    s.paramTable.declare('x', 'number', 5);
    s.reset();
    expect(s.warnings).toHaveLength(0);
    expect(s.paramTable.size()).toBe(0);
  });

  it('paramTable is per-session (no cross-instance bleed)', () => {
    const a = new CaptureSession();
    const b = new CaptureSession();
    a.paramTable.declare('x', 'number', 5);
    expect(a.paramTable.has('x')).toBe(true);
    expect(b.paramTable.has('x')).toBe(false);
  });
});
