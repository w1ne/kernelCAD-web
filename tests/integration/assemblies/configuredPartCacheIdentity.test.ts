// SPDX-License-Identifier: MIT
// The part-eval memo and the evaluate-cache identity must not reuse a solid
// when the same part source is read from another directory, or when a geometry
// file beside an unchanged part source changes. The compact → wide → compact
// check evaluates the bearing block directly, so the second compact is not a
// memo hit.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { OcctBackend, initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { runScript } from '../../../src/composition/runScript';
import { rewriteParamsForConfiguration } from '../../../src/modeling/capture/partConfiguration';
import type { Scene } from '../../../src/modeling/validation/scene';

const BEARING = resolve('examples/manufacturing-showcase/bearing-block.kcad.ts');

const PART = `const tag = param('tag', 'a', { maxLength: 4 });
configurations({ only: { tag: 'a' } });
return definePart({ shape: await lib.fromSTEP('block.step') });
`;

const DYNAMIC = `const tag = param('tag', 'a', { maxLength: 4 });
configurations({ only: { tag: 'a' } });
const file = 'block.step';
return definePart({ shape: await lib.fromSTEP(file) });
`;

let step10: Buffer;
let step20: Buffer;
let step30: Buffer;

function bearingVolume(length: number, width: number, thickness: number): number {
  const counterboreDepth = 7;
  const removed = Math.PI * (
    4.25 ** 2 * (thickness - counterboreDepth)
    + 11 ** 2 * counterboreDepth
    + 4 * 2.75 ** 2 * thickness
  );
  return length * width * thickness - removed;
}

function writePart(dir: string, source: string, step: Buffer): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'part.kcad.ts');
  writeFileSync(path, source);
  writeFileSync(join(dir, 'block.step'), step);
  return path;
}

async function instanceVolume(partPath: string): Promise<number> {
  const run = await runScript({
    code: `
      const arm = assembly('cache');
      await arm.instance('block', { source: ${JSON.stringify(partPath)}, configuration: 'only' });
      return arm.model();
    `,
    fileName: 'host.kcad.ts',
    scriptDir: dirname(partPath),
  });
  const scene = run.returnValue as Scene;
  return (await scene.part('block').shape.lower()).volume();
}

describe('configured part cache identity', () => {
  beforeAll(async () => {
    await initOcct();
    step10 = Buffer.from(await OcctBackend.box(10, 10, 10, false).exportSTEPAsync());
    step20 = Buffer.from(await OcctBackend.box(20, 20, 20, false).exportSTEPAsync());
    step30 = Buffer.from(await OcctBackend.box(30, 30, 30, false).exportSTEPAsync());
  });

  it('does not reuse a solid when the same part source reads a different directory', async () => {
    const root = mkdtempSync(join(tmpdir(), 'kcad-config-dirs-'));
    const dirA = join(root, 'a');
    const dirB = join(root, 'b');
    const partA = writePart(dirA, PART, step10);
    const partB = writePart(dirB, PART, step20);
    expect(readFileSync(partA)).toEqual(readFileSync(partB));

    const run = await runScript({
      code: `
        const arm = assembly('dirs');
        await arm.instance('small', { source: ${JSON.stringify(partA)}, configuration: 'only' });
        await arm.instance('large', { source: ${JSON.stringify(partB)}, configuration: 'only' });
        return arm.model();
      `,
      fileName: 'dirs.kcad.ts',
      scriptDir: root,
    });
    const scene = run.returnValue as Scene;
    const small = (await scene.part('small').shape.lower()).volume();
    const large = (await scene.part('large').shape.lower()).volume();
    expect(small).toBeCloseTo(1000, 1);
    expect(large).toBeCloseTo(8000, 1);
    expect(large).not.toBeCloseTo(small, 0);

    writeFileSync(join(dirA, 'block.step'), step30);
    expect(readFileSync(partA, 'utf8')).toBe(PART);
    expect(await instanceVolume(partA)).toBeCloseTo(27000, 1);
  }, 40_000);

  it('reads a changed geometry file when the part computes the path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kcad-config-dynamic-'));
    const part = writePart(dir, DYNAMIC, step10);
    expect(await instanceVolume(part)).toBeCloseTo(1000, 1);
    writeFileSync(join(dir, 'block.step'), step20);
    expect(readFileSync(part, 'utf8')).toBe(DYNAMIC);
    expect(await instanceVolume(part)).toBeCloseTo(8000, 1);
  }, 40_000);

  it('exports byte-identical STEP for compact, then wide, then compact, without the instance memo', async () => {
    const source = readFileSync(BEARING, 'utf8');
    const compactCode = rewriteParamsForConfiguration(source, { length: 80, width: 50, thickness: 18 });
    const wideCode = rewriteParamsForConfiguration(source, { length: 110, width: 70, thickness: 22 });
    const scriptDir = dirname(BEARING);

    async function evaluate(code: string): Promise<{ step: Uint8Array; length: number; width: number; thickness: number; volume: number }> {
      const run = await runScript({ code, fileName: 'bearing-block.kcad.ts', scriptDir });
      const shape = run.returnValue as { lower(): Promise<{ exportSTEPAsync(): Promise<Uint8Array>; volume(): number }> };
      const solid = await shape.lower();
      return {
        step: await solid.exportSTEPAsync(),
        length: run.paramTable.get('length').value as number,
        width: run.paramTable.get('width').value as number,
        thickness: run.paramTable.get('thickness').value as number,
        volume: solid.volume(),
      };
    }

    const first = await evaluate(compactCode);
    const wide = await evaluate(wideCode);
    const second = await evaluate(compactCode);

    expect(first.length).toBe(80);
    expect(first.width).toBe(50);
    expect(first.thickness).toBe(18);
    expect(wide.length).toBe(110);
    expect(wide.width).toBe(70);
    expect(wide.thickness).toBe(22);
    expect(second.length).toBe(80);
    expect(second.width).toBe(50);
    expect(second.thickness).toBe(18);

    expect(first.volume).toBeCloseTo(bearingVolume(80, 50, 18), 1);
    expect(wide.volume).toBeCloseTo(bearingVolume(110, 70, 22), 1);
    expect(second.volume).toBeCloseTo(bearingVolume(80, 50, 18), 1);
    expect(wide.volume).not.toBeCloseTo(first.volume, 0);

    expect(Buffer.from(first.step).equals(Buffer.from(second.step))).toBe(true);
    expect(Buffer.from(first.step).equals(Buffer.from(wide.step))).toBe(false);
    expect(createHash('sha256').update(first.step).digest('hex')).toBe(createHash('sha256').update(second.step).digest('hex'));
  }, 55_000);
});
