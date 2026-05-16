// tests/integration/v0.2-tracked-refs.test.ts
// Integration test matrix for v0.2.0 tracked face/edge refs across transforms + booleans.
// This file is the v0.2.0 ship gate — every test must pass before the branch merges.

import { describe, it, beforeAll } from 'vitest';
import { evaluateScript } from '../../src/agent/cli/commands/evaluate';
import { initOcct } from '../../src/kernel/backends/occt/occtBackend';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function expectSuccess(script: string): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), 'kcad-v0.2-'));
  const file = join(tmp, 'test.kcad.ts');
  writeFileSync(file, script);
  const result = await evaluateScript({ file });
  if (result.exitCode !== 0) {
    throw new Error(`Expected success but got exit ${result.exitCode}: ${JSON.stringify(result.diagnostics, null, 2)}`);
  }
}

async function expectError(script: string, expectedCode: string): Promise<void> {
  const tmp = mkdtempSync(join(tmpdir(), 'kcad-v0.2-'));
  const file = join(tmp, 'test.kcad.ts');
  writeFileSync(file, script);
  const result = await evaluateScript({ file });
  if (result.exitCode === 0) {
    throw new Error(`Expected failure with code ${expectedCode} but got success`);
  }
  const codes = result.diagnostics.map((d: any) => d.code);
  if (!codes.includes(expectedCode)) {
    throw new Error(`Expected diagnostic code ${expectedCode}, got: ${codes.join(', ')}`);
  }
}

describe('v0.2.0 tracked face/edge refs — integration matrix', () => {
  beforeAll(async () => { await initOcct(); });

  // ============================================================================
  // 1. Backward-compat: scripts that worked before still work
  // ============================================================================
  describe('backward compat', () => {
    it('canonical fillet on un-transformed primitive', async () => {
      await expectSuccess(`return box(20, 20, 20).fillet(2, { face: 'top' });`);
    });
    it('canonical fillet BEFORE transforms (the old workaround)', async () => {
      await expectSuccess(`return box(20, 20, 20).fillet(2, { face: 'top' }).translate(5, 0, 0);`);
    });
  });

  // ============================================================================
  // 2. Single-transform success cases (the primary v0.2 win)
  // ============================================================================
  describe('canonical fillet AFTER single transform', () => {
    it('after translate', async () => {
      await expectSuccess(`return box(20, 20, 20).translate(5, 0, 0).fillet(2, { face: 'top' });`);
    });
    it('after rotate', async () => {
      await expectSuccess(`return box(20, 20, 20).rotate([0, 0, 1], 45).fillet(2, { face: 'top' });`);
    });
    it('after scale', async () => {
      await expectSuccess(`return box(20, 20, 20).scale(2).fillet(2, { face: 'top' });`);
    });
    it('after reflect', async () => {
      await expectSuccess(`return box(20, 20, 20).reflect('xy').fillet(2, { face: 'bottom' });`);
    });
    it('after mirror', async () => {
      await expectSuccess(`return box(20, 20, 20).mirror('yz').fillet(2, { face: 'top' });`);
    });
  });

  describe('canonical chamfer AFTER single transform', () => {
    it('after translate', async () => {
      await expectSuccess(`return box(20, 20, 20).translate(5, 0, 0).chamfer(0.5, { face: 'top' });`);
    });
    it('after rotate', async () => {
      await expectSuccess(`return box(20, 20, 20).rotate([0, 0, 1], 45).chamfer(0.5, { face: 'top' });`);
    });
    it('after scale', async () => {
      await expectSuccess(`return box(20, 20, 20).scale(2).chamfer(0.5, { face: 'top' });`);
    });
  });

  describe('canonical shell AFTER single transform', () => {
    it('after translate', async () => {
      await expectSuccess(`return box(20, 20, 20).translate(5, 0, 0).shell(1, { face: 'top' });`);
    });
    it('after rotate', async () => {
      await expectSuccess(`return box(20, 20, 20).rotate([0, 0, 1], 45).shell(1, { face: 'top' });`);
    });
  });

  // ============================================================================
  // 3. Single-boolean success cases (modified-but-singular)
  // ============================================================================
  describe('canonical fillet AFTER single boolean (unambiguous)', () => {
    it('subtract that pierces top->bottom (annular hole, top face still singular)', async () => {
      await expectSuccess(`
        const body = box(20, 20, 20);
        const tool = cylinder(50, 3).translate(10, 10, -15);
        return body.subtract(tool).fillet(0.5, { face: 'top' });
      `);
    });
    it('union with overlapping box', async () => {
      await expectSuccess(`return box(20, 20, 20).union(box(10, 10, 10).translate(5, 5, 5)).fillet(0.5, { face: 'top' });`);
    });
    it('intersect with overlapping box', async () => {
      await expectSuccess(`return box(20, 20, 20).intersect(box(10, 10, 10).translate(5, 5, 5)).fillet(0.5, { face: 'top' });`);
    });
  });

  // ============================================================================
  // 4. Combined transform + boolean
  // ============================================================================
  describe('canonical fillet AFTER transform + boolean', () => {
    it('translate then subtract then fillet', async () => {
      await expectSuccess(`
        return box(20, 20, 20).translate(5, 0, 0)
          .subtract(cylinder(50, 3).translate(15, 10, -15))
          .fillet(0.5, { face: 'top' });
      `);
    });
  });

  // ============================================================================
  // 5. Ambiguous-split cases (must emit face-ref-ambiguous-after-split)
  // ============================================================================
  describe('ambiguous-split cases emit correct diagnostic', () => {
    it('subtract a divider that splits top into two halves', async () => {
      await expectError(`
        const body = box(20, 20, 20);
        const divider = box(30, 5, 30).translate(-5, 7.5, -5);
        return body.subtract(divider).fillet(1, { face: 'top' });
      `, 'feature.face-ref.ambiguous-after-split');
    });
  });

  // ============================================================================
  // 6. Removed-face cases (must emit face-ref-removed)
  // ============================================================================
  describe('removed-face cases emit correct diagnostic', () => {
    it('subtract that engulfs the entire body', async () => {
      await expectError(`
        const body = box(10, 10, 10);
        const tool = box(50, 50, 50).translate(-20, -20, -20);
        return body.subtract(tool).fillet(0.5, { face: 'top' });
      `, 'feature.face-ref.removed');
    });
  });

  // ============================================================================
  // 7. Iterated edge features
  // ============================================================================
  describe('iterated edge features preserve identity', () => {
    it('fillet then fillet on the same canonical face', async () => {
      await expectSuccess(`
        return box(20, 20, 20)
          .fillet(2, { face: 'top' })
          .fillet(0.5, { face: 'top' });
      `);
    });
  });

  // ============================================================================
  // 8. Cylinder canonical refs (top/bottom only)
  // ============================================================================
  describe('cylinder canonical refs across operations', () => {
    it('cylinder.translate.fillet({face: top})', async () => {
      await expectSuccess(`return cylinder(20, 10).translate(5, 0, 0).fillet(1, { face: 'top' });`);
    });
    it('cylinder.translate.fillet({face: bottom})', async () => {
      await expectSuccess(`return cylinder(20, 10).translate(5, 0, 0).fillet(1, { face: 'bottom' });`);
    });
  });
});
