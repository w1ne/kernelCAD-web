// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { CodeMutationService } from './CodeMutationService';

describe('CodeMutationService diagnostics', () => {
  it('tracks succeeded and failed mutations', () => {
    let code = 'const a = 1;';
    const service = new CodeMutationService((updater) => {
      code = updater(code);
    });

    service.apply((prev) => `${prev}\nconst b = 2;`, 'add-b');
    service.apply(() => 'const invalid = ;', 'invalid');

    const diagnostics = service.getDiagnostics();
    expect(code).toContain('const b = 2;');
    expect(code).not.toContain('const invalid = ;');
    expect(diagnostics.attempts).toBe(2);
    expect(diagnostics.succeeded).toBe(1);
    expect(diagnostics.failed).toBe(1);
  });

  it('resets diagnostics counters', () => {
    let code = 'const a = 1;';
    const service = new CodeMutationService((updater) => {
      code = updater(code);
    });
    service.apply((prev) => `${prev}\nconst b = 2;`, 'add-b');
    expect(service.getDiagnostics().attempts).toBe(1);

    service.resetDiagnostics();
    expect(service.getDiagnostics()).toEqual({
      attempts: 0,
      succeeded: 0,
      failed: 0,
    });
  });
});

