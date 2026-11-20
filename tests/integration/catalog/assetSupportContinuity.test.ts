// SPDX-License-Identifier: MIT
// Static CC0 prop geometry only. These tests do not certify load or pressure capacity.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { buildCatalogAssetWithGlb } from '../../../src/agent/catalog/buildCatalog';
import { runAndExport } from '../../../src/agent/script-runtime/export';

type Bounds = { min: number[]; max: number[] };
const root = resolve(import.meta.dirname, '../../..');
const liftFile = 'catalog/kits/construction-equipment/drywall-panel-lift.kcad.ts';
const bankFile = 'catalog/kits/grid-substation/substation-fire-suppression-cylinder-bank.kcad.ts';
const read = (file: string) => readFileSync(resolve(root, file), 'utf8');
const tolerance = 0.05; // Native GLB positions, in mm.

async function namedBounds(bytes: Uint8Array): Promise<Map<string, Bounds>> {
  const doc = await new NodeIO().readBinary(bytes);
  const result = new Map<string, Bounds>();
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const matrix = node.getWorldMatrix();
    const points = mesh.listPrimitives().flatMap((primitive) => {
      const position = primitive.getAttribute('POSITION');
      if (!position) return [];
      return Array.from({ length: position.getCount() }, (_, index) => {
        const point = position.getElement(index, []);
        return [0, 1, 2].map((axis) => 1000 * (matrix[axis]! * point[0]!
          + matrix[axis + 4]! * point[1]! + matrix[axis + 8]! * point[2]! + matrix[axis + 12]!));
      });
    });
    result.set(node.getName(), {
      min: [0, 1, 2].map((axis) => Math.min(...points.map((point) => point[axis]!))),
      max: [0, 1, 2].map((axis) => Math.max(...points.map((point) => point[axis]!))),
    });
  }
  return result;
}

const touches = (a: Bounds, b: Bounds) => [0, 1, 2].every((axis) =>
  a.max[axis]! + tolerance >= b.min[axis]! && b.max[axis]! + tolerance >= a.min[axis]!);
const center = (bounds: Bounds, axis: number) => (bounds.min[axis]! + bounds.max[axis]!) / 2;

function bankFailures(parts: Map<string, Bounds>): string[] {
  const failures: string[] = [];
  const rack = parts.get('rack-base')!;
  const header = parts.get('manifold-header')!;
  for (let i = 1; i <= 5; i++) {
    const bottle = parts.get(`cylinder-${i}`);
    const valve = parts.get(`valve-${i}`);
    const branch = parts.get(`manifold-branch-${i}`);
    if (!bottle || !valve) { failures.push(`bottle-${i}: missing`); continue; }
    if ([0, 2].some((axis) => bottle.min[axis]! < rack.min[axis]! - tolerance
      || bottle.max[axis]! > rack.max[axis]! + tolerance)) failures.push(`bottle-${i}: outside rack`);
    if (Math.abs(bottle.min[1]! - rack.max[1]!) > tolerance) failures.push(`bottle-${i}: unseated`);
    if (!touches(bottle, valve)) failures.push(`valve-${i}: floating`);
    if (!branch || !touches(branch, valve) || !touches(branch, header)) failures.push(`branch-${i}: disconnected`);
  }
  return failures;
}

function casterFailures(parts: Map<string, Bounds>, index: number): string[] {
  const failures: string[] = [];
  const wheel = parts.get(`caster-${index}`), axle = parts.get(`caster-axle-${index}`);
  const bridge = parts.get(`caster-bridge-${index}`), leg = parts.get(`base-leg-${index}`);
  if (!wheel || !axle || !touches(wheel, axle)) failures.push(`caster-${index}: wheel-to-axle gap`);
  if (!bridge || !leg || !touches(bridge, leg)) failures.push(`caster-${index}: bridge-to-leg gap`);
  for (const side of [-1, 1]) {
    const fork = parts.get(`caster-fork-${index}-${side}`);
    if (!fork || !axle || !bridge || !touches(fork, axle) || !touches(fork, bridge))
      failures.push(`caster-${index}: fork support gap`);
  }
  return failures;
}

function liftFailures(parts: Map<string, Bounds>): string[] {
  const failures: string[] = [];
  const wheels = [...parts.entries()].filter(([name]) => /^caster-\d$/.test(name));
  const legs = [...parts.entries()].filter(([name]) => /^base-leg-\d$/.test(name));
  if (wheels.length !== 3 || legs.length !== 3) failures.push('base is not a three-caster tripod');
  for (const [name, wheel] of wheels) {
    if (Math.abs(wheel.min[1]!) > tolerance) failures.push(`${name}: not grounded`);
  }
  for (let i = 0; i < 3; i++) failures.push(...casterFailures(parts, i));
  const hub = parts.get('base-hub');
  for (const [name, leg] of legs) if (!hub || !touches(hub, leg)) failures.push(`${name}: detached`);
  const mast = parts.get('mast')!, cradle = parts.get('tilt-cradle')!, crossbar = parts.get('cradle-crossbar')!;
  const extension = parts.get('mast-extension');
  if (!extension || !touches(extension, mast) || !touches(extension, cradle)) failures.push('mast-to-cradle gap');
  if (!touches(cradle, crossbar)) failures.push('crossbar-to-cradle gap');
  for (const name of ['cradle-arm--1', 'cradle-arm-1']) {
    const arm = parts.get(name);
    if (!arm || !touches(arm, crossbar)) failures.push(`${name}: detached`);
  }
  if (wheels.length === 3) {
    const vertices = wheels.map(([, b]) => [center(b, 0), center(b, 2)]);
    const signs = vertices.map((a, i) => {
      const b = vertices[(i + 1) % 3]!;
      return a[0]! * b[1]! - a[1]! * b[0]!;
    });
    if (!(signs.every((v) => v > 100) || signs.every((v) => v < -100))) failures.push('mast outside caster support triangle');
  }
  return failures;
}

async function variant(file: string, code: string): Promise<Map<string, Bounds>> {
  const output = await runAndExport({ code, fileName: file.split('/').at(-1)!,
    scriptDir: resolve(root, file, '..'), format: 'glb',
    options: { format: 'glb', style: 'lowpoly', lowpoly: { maxTriangles: 2200 } } });
  expect(output.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return namedBounds(output.bytes);
}
const withScale = (code: string, scale: number) => code.replace(/param\((['"])scale\1, 1,/, `param('scale', ${scale},`);

beforeAll(async () => { await initOcct(); }, 60_000);

describe('catalog support continuity', () => {
  it('seats all five bottles within the rack and connects every valve to the manifold', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, bankFile);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(bankFailures(await namedBounds(glb))).toEqual([]);
  }, 60_000);

  it('rejects the original unsupported bottles and floating manifold valves', async () => {
    const parts = await variant(bankFile, read('tests/fixtures/catalog/fireSuppressionCylinderBankOriginal.kcad.ts'));
    expect(bankFailures(parts)).toEqual(expect.arrayContaining(['bottle-4: outside rack', 'bottle-5: outside rack', 'valve-1: floating']));
  }, 60_000);

  it('supports the lift cradle over a grounded caster triangle', async () => {
    const { asset, glb } = await buildCatalogAssetWithGlb(root, liftFile);
    expect(asset.stats.triangles).toBeLessThanOrEqual(asset.triangleBudget);
    expect(asset.stats.minUpM).toBeCloseTo(0, 5);
    expect(liftFailures(await namedBounds(glb))).toEqual([]);
  }, 60_000);

  it('rejects the original floating lift head and two-wheel base', async () => {
    const parts = await variant(liftFile, read('tests/fixtures/catalog/drywallPanelLiftOriginal.kcad.ts'));
    expect(liftFailures(parts)).toEqual(expect.arrayContaining(['base is not a three-caster tripod', 'mast-to-cradle gap', 'crossbar-to-cradle gap']));
  }, 60_000);


  it('rejects a missing caster bridge even when all three wheels remain grounded', async () => {
    const code = read(liftFile).replace(/^ {2}add\(`caster-bridge-.*$/m, '');
    expect(code).not.toBe(read(liftFile));
    expect(liftFailures(await variant(liftFile, code))).toEqual(expect.arrayContaining(['caster-0: bridge-to-leg gap']));
  }, 60_000);

  it('preserves support contacts at both declared scale limits', async () => {
    for (const scale of [0.65, 1.35]) expect(bankFailures(await variant(bankFile, withScale(read(bankFile), scale)))).toEqual([]);
    for (const scale of [0.7, 1.3]) expect(liftFailures(await variant(liftFile, withScale(read(liftFile), scale)))).toEqual([]);
  }, 60_000);
});
