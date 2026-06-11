// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import { defaultBuildRepairPrompt, type GateVerdict } from './types.js';

describe('defaultBuildRepairPrompt', () => {
  it('lists only failing verdicts with code/message/hint', () => {
    const verdicts: GateVerdict[] = [
      { gate: 'evaluate', ok: true, message: 'all good' },
      { gate: 'mechanism', ok: false, code: 'mechanism.interpenetration', message: 'parts overlap' },
      { gate: 'interference', ok: false, code: 'interference.overlap', message: 'A∩B', hint: 'move A by 2mm' },
    ];
    const prompt = defaultBuildRepairPrompt(verdicts);
    expect(prompt).toBe(
      'Diagnostics:\n' +
        '- mechanism.interpenetration: parts overlap\n' +
        '- interference.overlap: A∩B (hint: move A by 2mm)\n' +
        'Fix and return the full corrected script.',
    );
  });

  it('falls back to gate name when code is absent', () => {
    const verdicts: GateVerdict[] = [{ gate: 'evaluate', ok: false, message: 'boom' }];
    expect(defaultBuildRepairPrompt(verdicts)).toBe(
      'Diagnostics:\n- evaluate: boom\nFix and return the full corrected script.',
    );
  });
});
