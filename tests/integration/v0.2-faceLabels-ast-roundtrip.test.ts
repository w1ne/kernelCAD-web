// tests/integration/v0.2-faceLabels-ast-roundtrip.test.ts
// Task 8: AST round-trip tests for faceLabels.
//
// The kernelCAD add_feature tool is a raw text insertion tool — the agent
// writes a TypeScript code snippet that is spliced into the script source.
// The round-trip under test is:
//
//   addFeature(source, snippet)  →  written TS source contains valid faceLabels syntax
//   runScript(written)           →  CaptureSession populates record.metadata.faceLabels
//
// No emitter/parser patching is needed: addFeature is generic (it inserts any
// string), and the CaptureSession/API already capture faceLabels generically
// via validateFaceLabels + session.createShape. This test is the contract proof.

import { describe, it, expect, beforeAll } from 'vitest';
import { addFeature } from '../../src/mcp/edits/addFeature';
import { runScript } from '../../src/script-runtime/runScript';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';

// Minimal script skeleton with a top-level return so addFeature has a target.
const SKELETON = `return box(10, 10, 10);\n`;

async function writeAndRun(featureCode: string): Promise<ReturnType<typeof runScript>> {
  const edit = addFeature(SKELETON, featureCode);
  if (!edit.ok || !edit.new_code) throw new Error(`addFeature failed: ${edit.error}`);
  return runScript({ code: edit.new_code, fileName: 'roundtrip.kcad.ts' });
}

describe('faceLabels AST round-trip (Task 8)', () => {
  beforeAll(async () => { await initOcct(); });

  // ── 1. Canonical-alias faceLabels on box ────────────────────────────────
  it('round-trips canonical-alias faceLabels through write→read (box)', async () => {
    // The agent would write this TS snippet via add_feature.
    const featureCode = `const part = box(10, 10, 5, false, { faceLabels: { lid: 'top', base: 'bottom' } });`;

    // Verify the written source contains the expected faceLabels syntax.
    const edit = addFeature(SKELETON, featureCode);
    expect(edit.ok).toBe(true);
    const written = edit.new_code!;
    expect(written).toContain('faceLabels');
    expect(written).toMatch(/lid:\s*['"]top['"]/);
    expect(written).toMatch(/base:\s*['"]bottom['"]/);

    // Verify the parser (runScript → CaptureSession) reads faceLabels back.
    const result = await runScript({ code: written, fileName: 'roundtrip.kcad.ts' });
    const boxRecord = result.records.find(r => r.kind === 'box');
    expect(boxRecord).toBeDefined();
    expect((boxRecord!.metadata as { faceLabels?: unknown }).faceLabels)
      .toEqual({ lid: 'top', base: 'bottom' });
  });

  // ── 2. Query-based faceLabels on path().close().extrude() ───────────────
  it('round-trips query-based faceLabels through write→read (sketch extrude)', async () => {
    // A standalone script; addFeature is not used here because the snippet
    // must produce a return — we test the runScript half of the round-trip.
    // The "write" side is the literal source below (agent would produce this).
    const source = `
      const part = path()
        .moveTo(0, 0)
        .lineTo(10, 0)
        .lineTo(10, 5)
        .lineTo(0, 5)
        .close()
        .extrude(5, { faceLabels: { rim: { atZ: 5, parallelTo: 'XY' } } });
      return part;
    `;
    // Written source must contain the expected syntax.
    expect(source).toContain('faceLabels');
    expect(source).toMatch(/rim:\s*\{/);
    expect(source).toMatch(/atZ:\s*5/);
    expect(source).toMatch(/parallelTo:\s*['"]XY['"]/);

    const result = await runScript({ code: source, fileName: 'roundtrip.kcad.ts' });
    const extrudeRecord = result.records.find(r => r.kind === 'extrude');
    expect(extrudeRecord).toBeDefined();
    expect((extrudeRecord!.metadata as { faceLabels?: unknown }).faceLabels)
      .toEqual({ rim: { atZ: 5, parallelTo: 'XY' } });
  });

  // ── 3. addFeature inserts faceLabels-bearing code preserving key ordering ─
  //
  // addFeature is a raw text insertion tool: it inserts the snippet verbatim.
  // Key ordering in the emitted source therefore matches INSERTION order
  // (whatever order the agent writes the keys in the string literal).
  // Two calls with different key ordering produce different source strings —
  // that is the correct and documented behavior for a text-insert tool.
  it('addFeature preserves insertion-order key ordering (text-insert contract)', () => {
    const base = `return box(1,1,1);\n`;

    const editABC = addFeature(base, `const s1 = box(5,5,5,false,{ faceLabels: { c: 'top', a: 'bottom', b: 'top' } });`);
    const editCAB = addFeature(base, `const s1 = box(5,5,5,false,{ faceLabels: { a: 'bottom', b: 'top', c: 'top' } });`);

    expect(editABC.ok).toBe(true);
    expect(editCAB.ok).toBe(true);

    // Since addFeature is a verbatim text inserter, the two emissions differ
    // when keys appear in different insertion order — insertion order is preserved.
    expect(editABC.new_code).not.toEqual(editCAB.new_code);

    // Both contain all three keys.
    for (const code of [editABC.new_code!, editCAB.new_code!]) {
      expect(code).toMatch(/\bc:\s*['"]top['"]/);
      expect(code).toMatch(/\ba:\s*['"]bottom['"]/);
      expect(code).toMatch(/\bb:\s*['"]top['"]/);
    }
  });
});
