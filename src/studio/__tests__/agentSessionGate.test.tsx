// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { agentAccess } from '../activityBarModel';

const src = readFileSync(
  fileURLToPath(new URL('../ActivityBar.tsx', import.meta.url)),
  'utf8',
);

describe('agent rail requires a session', () => {
  it('reads the session in the activity bar', () => {
    expect(src).toMatch(/useOptionalSession/);
  });

  it('mounts the rail only when the agent can run', () => {
    // Agent mode requires a configured-auth backend AND a live session, so the
    // rail is not mounted locally (no auth) or for a signed-out visitor; embed
    // shells (enableAgentRail=false) do not show the Agent at all.
    expect(src).toMatch(/if \(access === 'ready'\) \{[\s\S]{0,200}<AgentRail \/>/);
    expect(src).toMatch(/const showAgent = enableAgent && !viewerMode;/);
    for (const authConfigured of [true, false]) {
      for (const signedIn of [true, false]) {
        const access = agentAccess({ inAppAgent: true, authConfigured, sessionLoading: false, signedIn });
        expect(access === 'ready').toBe(authConfigured && signedIn);
      }
    }
  });
});
