// tests/unit/mcp/typedParamsDispatcher.test.ts
//
// Regression coverage for two dispatcher-level bugs found by re-verification
// of the typed-params slice — both missed by tests that called the tool
// functions directly instead of going through the PUBLIC MCP dispatcher
// (`callMcpTool` from `toolRegistry.ts`), which is what a real agent/caller
// actually uses:
//
//  1. `inspect({ of: 'params', file | code })` used to drop `file`/`code`
//     entirely (`case 'params': return paramsListTool();` — no `rest`
//     forwarded) and always returned `{ params: [] }` unless a prior
//     `evaluate_script` call had already left a session active.
//
//  2. `set_param` only validated a mismatched `new_value` when evaluating
//     the ORIGINAL script succeeded. When evaluation fails for an unrelated
//     reason, the evaluation-based gate silently skips validation and
//     `new_code` comes back with the mismatch rewritten in untouched. Fixed
//     by adding a source-text (AST-lite) validation gate that reads the
//     param's declared kind from the `param()` call's literal default +
//     `meta.choices`/`meta.maxLength` — no script evaluation required — and
//     runs it UNCONDITIONALLY, before the evaluation-based gate.
//
// Every test here calls `callMcpTool('inspect', ...)` / `callMcpTool('set_param', ...)`
// — the same entry point kernelCAD-server and any external caller uses.

import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { callMcpTool } from '../../../src/agent/mcp/toolRegistry';

const TYPED_CODE = `
  const hasLid = param('HasLid', true);
  const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
  const label = param('Label', 'KCAD', { maxLength: 24 });
  const diameters: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };
  let body = box(60, 40, 5).hole('top', { u: 0, v: 0, diameter: diameters[screw.value], depth: 'through' });
  if (hasLid.value) { body = body.chamfer(1, { face: 'top' }); }
  return body;
`;

// A script that fails to evaluate for a reason UNRELATED to the params
// being edited (an undefined identifier) — reproduces the coordinator's
// "font load fails" scenario without depending on font/filesystem state:
// what matters is that `evaluateAndBuildScript` on the ORIGINAL code
// returns a non-zero exit code, so the evaluation-based validation gate
// has nothing to check against.
const BROKEN_TYPED_CODE = `
  const hasLid = param('HasLid', true);
  const screw = param('Screw', 'M4', { choices: ['M3', 'M4', 'M5'] });
  const label = param('Label', 'KCAD', { maxLength: 24 });
  let body = box(20, 20, 10);
  body = body.union(thisIdentifierDoesNotExist);
  return body;
`;

describe('typed-params via the public MCP dispatcher (callMcpTool)', () => {
  beforeAll(async () => { await initOcct(); });

  describe('inspect({ of: "params" }) forwards file/code (was: always {params:[]})', () => {
    it('evaluates { code } fresh through the dispatcher', async () => {
      const result = await callMcpTool('inspect', { of: 'params', code: TYPED_CODE }) as { params: unknown[] };
      expect(result.params).toEqual([
        { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
        { name: 'Screw', type: 'choice', value: 'M4', defaultValue: 'M4', choices: ['M3', 'M4', 'M5'] },
        { name: 'Label', type: 'string', value: 'KCAD', defaultValue: 'KCAD' },
      ]);
    });

    it('evaluates { file } fresh through the dispatcher', async () => {
      const tmp = mkdtempSync(join(tmpdir(), 'kcad-inspect-params-'));
      const file = join(tmp, 'demo.kcad.ts');
      writeFileSync(file, TYPED_CODE);

      const result = await callMcpTool('inspect', { of: 'params', file }) as { params: unknown[] };
      expect(result.params).toEqual([
        { name: 'HasLid', type: 'boolean', value: true, defaultValue: true },
        { name: 'Screw', type: 'choice', value: 'M4', defaultValue: 'M4', choices: ['M3', 'M4', 'M5'] },
        { name: 'Label', type: 'string', value: 'KCAD', defaultValue: 'KCAD' },
      ]);
    });
  });

  describe('set_param rejects a mismatch through the dispatcher, even on a script that fails to evaluate', () => {
    it('accepts a valid choice edit on a clean script', async () => {
      const r = await callMcpTool('set_param', { code: TYPED_CODE, param_name: 'Screw', new_value: 'M5' }) as { ok: boolean; new_code?: string };
      expect(r.ok).toBe(true);
      expect(r.new_code).toContain(`param('Screw', 'M5',`);
    });

    it('rejects a non-boolean for a boolean param (clean script)', async () => {
      const r = await callMcpTool('set_param', { code: TYPED_CODE, param_name: 'HasLid', new_value: 'yes' }) as { ok: boolean; new_code?: string; error?: string };
      expect(r.ok).toBe(false);
      expect(r.new_code).toBeUndefined();
      expect(r.error).toMatch(/type-mismatch/);
    });

    it('rejects a non-string for a string param (clean script)', async () => {
      const r = await callMcpTool('set_param', { code: TYPED_CODE, param_name: 'Label', new_value: 42 }) as { ok: boolean; new_code?: string; error?: string };
      expect(r.ok).toBe(false);
      expect(r.new_code).toBeUndefined();
      expect(r.error).toMatch(/type-mismatch/);
    });

    it('rejects a value outside choices for a choice param (clean script)', async () => {
      const r = await callMcpTool('set_param', { code: TYPED_CODE, param_name: 'Screw', new_value: 'M9' }) as { ok: boolean; new_code?: string; error?: string };
      expect(r.ok).toBe(false);
      expect(r.new_code).toBeUndefined();
      expect(r.error).toMatch(/choice-invalid/);
    });

    // --- The regression: the ORIGINAL script fails to evaluate. The
    // evaluation-based gate has nothing to validate against, so ONLY the
    // source-text gate can catch these. Before the fix, all three of these
    // returned ok:false from the downstream re-evaluate failure but WITH
    // new_code present, carrying the mismatched value rewritten into the
    // source untouched by validation.

    it('rejects a non-boolean for a boolean param when the script fails to evaluate', async () => {
      const r = await callMcpTool('set_param', { code: BROKEN_TYPED_CODE, param_name: 'HasLid', new_value: 'yes' }) as { ok: boolean; new_code?: string; error?: string };
      expect(r.ok).toBe(false);
      expect(r.new_code).toBeUndefined();
      expect(r.error).toMatch(/type-mismatch/);
    });

    it('rejects a non-string for a string param when the script fails to evaluate', async () => {
      const r = await callMcpTool('set_param', { code: BROKEN_TYPED_CODE, param_name: 'Label', new_value: 42 }) as { ok: boolean; new_code?: string; error?: string };
      expect(r.ok).toBe(false);
      expect(r.new_code).toBeUndefined();
      expect(r.error).toMatch(/type-mismatch/);
    });

    it('rejects a value outside choices for a choice param when the script fails to evaluate', async () => {
      const r = await callMcpTool('set_param', { code: BROKEN_TYPED_CODE, param_name: 'Screw', new_value: 'M9' }) as { ok: boolean; new_code?: string; error?: string };
      expect(r.ok).toBe(false);
      expect(r.new_code).toBeUndefined();
      expect(r.error).toMatch(/choice-invalid/);
    });
  });
});
