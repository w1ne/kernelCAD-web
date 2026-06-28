// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const src = readFileSync(
  fileURLToPath(new URL('../StudioShell.tsx', import.meta.url)),
  'utf8',
);

describe('agent rail requires a session', () => {
  it('imports useSession', () => {
    expect(src).toMatch(/useSession/);
  });
  it('derives agentEnabled from session and gates the rail with it', () => {
    expect(src).toMatch(/const\s+agentEnabled\s*=\s*enableAgentRail\s*&&\s*!!session/);
    expect(src).toMatch(/agentEnabled\s*&&\s*agentRailOpen\s*&&\s*!viewerMode\s*&&\s*<AgentRail/);
  });
});
