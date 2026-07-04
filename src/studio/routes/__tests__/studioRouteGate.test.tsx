// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// The route components are thin wrappers; assert they compose StudioAuthGate
// around <App/> rather than rendering <App/> bare.
const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), 'utf8');

describe('authoring routes are gated', () => {
  it('index route wraps App in StudioAuthGate', () => {
    const src = read('../index.tsx');
    expect(src).toMatch(/StudioAuthGate/);
    expect(src).toMatch(/<StudioAuthGate>\s*<App\s*\/>\s*<\/StudioAuthGate>/);
  });
  it('studio route wraps App in StudioAuthGate', () => {
    const src = read('../studio.tsx');
    expect(src).toMatch(/StudioAuthGate/);
    expect(src).toMatch(/<StudioAuthGate>\s*<App\s*\/>\s*<\/StudioAuthGate>/);
  });
});
