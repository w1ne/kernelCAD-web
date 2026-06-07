// tests/integration/physics-loop/cliStudioParityShared.ts
//
// Shared fixture paths and helpers for the CLI / Studio mechanism-truth
// parity tests (cliStudioParity.test.ts + cliStudioParity.physics.test.ts).
// Extracted so the suite can be split across files for CI shard balance
// without duplicating the stdout-capture plumbing.

import { resolve } from 'node:path';
import { runValidateCli } from '../../../src/agent/cli/commands/validate';

export const VEC3_SPRING_BROKEN_FIXTURE = resolve(
  __dirname,
  '../../fixtures/mechanism/vec3-spring-broken.kcad.ts',
);
export const CLEVIS_HINGE_REAL_FIXTURE = resolve(
  __dirname,
  '../../fixtures/mechanism/clevis-hinge-real.kcad.ts',
);

export interface CapturedCliResult {
  mechanism?: string;
  mechanismFailures?: Array<{ code: string }>;
}

export async function captureValidateJson(input: {
  file: string;
  includeInterference: boolean;
  includePhysics: boolean;
}): Promise<CapturedCliResult> {
  // runValidateCli writes its JSON output to console.log. We intercept
  // it so the test can read the structured mechanism field without
  // shelling out.
  const captured: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    captured.push(args.map(String).join(' '));
  };
  try {
    await runValidateCli({
      file: input.file,
      json: true,
      includeInterference: input.includeInterference,
      epsilon: 0.01,
      physical: false,
      includePhysics: input.includePhysics,
    });
  } finally {
    console.log = originalLog;
  }
  const stdout = captured.join('\n');
  // The JSON object should be the entire stdout (in --json mode there
  // are no other writes).
  const parsed = JSON.parse(stdout) as CapturedCliResult & {
    mechanism?: string;
    mechanismFailures?: Array<{ code: string }>;
  };
  return parsed;
}

export function sortedCodes(failures: ReadonlyArray<{ code: string }>): string[] {
  return failures.map((f) => f.code).sort();
}
