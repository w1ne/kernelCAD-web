// tests/integration/examples/sdfExamples.test.ts
//
// E2E corpus integration test for SDF slice 1 (W2.3). Drives each of the
// three corpus expert-solution scripts through the evaluate_script and
// get_shape_info MCP tools and asserts non-empty solid + no SDF-namespace
// error diagnostics. Mirrors the pattern of nurbs example tests.

import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateScriptTool } from '../../../src/mcp/tools/evaluateScript';
import { getShapeInfoTool } from '../../../src/mcp/tools/getShapeInfo';
import { initOcct } from '../../../src/backends/occt/occtBackend';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, '../../..');

beforeAll(async () => { await initOcct(); }, 60_000);

const TASKS = [
  { name: 'sdf-smooth-blend-bracket',          minVol: 1000,  maxVol: 8000 },
  { name: 'sdf-sphere-cylinder-smooth-union',  minVol: 2500,  maxVol: 8000 },
  { name: 'sdf-to-mesh-roundtrip',             minVol: 1500,  maxVol: 2300 },
];

describe('SDF slice-1 corpus tasks', () => {
  for (const t of TASKS) {
    it(`${t.name}: evaluates clean and lowers to a non-empty solid`, async () => {
      const file = `${REPO}/eval/tasks/${t.name}/solution-expert.kcad.ts`;
      const ev = await evaluateScriptTool({ file });
      expect(ev.ok, JSON.stringify(ev.diagnostics)).toBe(true);
      const errCodes = (ev.diagnostics ?? []).filter((d: { severity?: string }) => d.severity === 'error').map((d: { code: string }) => d.code);
      expect(errCodes, `unexpected errors: ${errCodes.join(', ')}`).toEqual([]);
      const s = await getShapeInfoTool({ file });
      expect(s.ok).toBe(true);
      if (s.ok && s.shape) {
        expect(s.shape.volume).toBeGreaterThan(t.minVol);
        expect(s.shape.volume).toBeLessThan(t.maxVol);
      }
    }, 120_000);
  }
});
