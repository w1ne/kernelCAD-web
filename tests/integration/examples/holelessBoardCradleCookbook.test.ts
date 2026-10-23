// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import { evaluateAndBuildScript } from '../../../src/composition/scriptEvaluation';
import { lookupCookbookTool } from '../../../src/agent/mcp/tools/lookupCookbook';
import { executeCookbookTool } from '../../../src/agent/mcp/tools/executeCookbook';
import { readFileSync } from 'node:fs';

const code = readFileSync('examples/cookbook/holeless-board-cradle.kcad.ts', 'utf8');

async function probeIntersection(probe: string, face = '-X', count = '4', offset = 0) {
  const faceCode = code
    .replace("param('connectorFace', '-X'", `param('connectorFace', '${face}'`)
    .replace("param('clipCount', '4'", `param('clipCount', '${count}'`)
    .replace("param('connectorOffsetMm', 0", `param('connectorOffsetMm', ${offset}`);
  const marker = 'return cradle;';
  expect(faceCode).toContain(marker);
  const probedCode = faceCode.replace(marker, `return cradle.intersect(${probe});`);
  return evaluateAndBuildScript({ code: probedCode });
}

async function intersectionVolume(probe: string, face = '-X', count = '4', offset = 0): Promise<number> {
  const { evaluation, model } = await probeIntersection(probe, face, count, offset);
  expect(evaluation.exitCode, JSON.stringify(evaluation.diagnostics)).toBe(0);
  expect(evaluation.diagnostics).toEqual([]);
  return model!.rootShape!.volume();
}

async function expectNoIntersection(probe: string, face = '-X', offset = 0): Promise<void> {
  const { evaluation, model } = await probeIntersection(probe, face, '4', offset);
  if (evaluation.exitCode === 0) {
    expect(evaluation.diagnostics).toEqual([]);
    expect(model!.rootShape!.volume()).toBeLessThan(1e-6);
    return;
  }
  // The modeling API reports an empty common volume as a diagnostic; that is
  // the expected result for a clear board envelope or an open connector path.
  expect(evaluation.diagnostics, JSON.stringify(evaluation.diagnostics)).toEqual([
    expect.objectContaining({ code: 'feature.intersection-empty' }),
  ]);
}

async function buildForFace(face: string) {
  const faceCode = code.replace("param('connectorFace', '-X'", `param('connectorFace', '${face}'`);
  return evaluateAndBuildScript({ code: faceCode });
}

beforeAll(async () => {
  await initOcct();
}, 60_000);

describe('hole-less board cradle cookbook', () => {
  it('builds a valid ESP32-sized cradle with a pin-clearance gap and enclosure-floor datum', async () => {
    const { evaluation, model } = await evaluateAndBuildScript({ code });
    expect(evaluation.exitCode, JSON.stringify(evaluation.diagnostics)).toBe(0);
    expect(evaluation.diagnostics).toEqual([]);
    const shape = model!.rootShape!;
    expect(shape.volume()).toBeGreaterThan(0);
    const bbox = shape.boundingBox();
    expect(bbox.min[2]).toBeCloseTo(0, 3);
    expect(bbox.max[2]).toBeGreaterThan(15);
    expect(bbox.max[0] - bbox.min[0]).toBeCloseTo(59.5, 1);
    expect(bbox.max[1] - bbox.min[1]).toBeCloseTo(33, 1);
  }, 180_000);

  it('keeps the 54.4 x 27.9 mm board clear between both rails', async () => {
    const board = 'box(54.4, 27.9, 1.6).translate(2.55, 2.55, 5)';
    await expectNoIntersection(board);
  }, 180_000);

  it('leaves the pin-clearance region open through the underside', async () => {
    await expectNoIntersection('box(44.4, 17.9, 3).translate(7.55, 7.55, 0)');
    expect(await intersectionVolume('box(1, 1, 2).translate(0, 0, 0)')).toBeGreaterThan(0.1);
  }, 180_000);

  it('places both catches over the board edge at the PCB top', async () => {
    const lowerCatchOverBoard = 'box(5, 0.85, 1.2).translate(7.55, 2.55, 6.6)';
    const upperCatchOverBoard = 'box(5, 0.85, 1.2).translate(7.55, 29.6, 6.6)';
    expect(await intersectionVolume(lowerCatchOverBoard)).toBeGreaterThan(0.1);
    expect(await intersectionVolume(upperCatchOverBoard)).toBeGreaterThan(0.1);
  }, 180_000);

  it('distributes catches along the selected board long axis and over its edges', async () => {
    const boardStart = 2.55;
    const clipWidth = 5;
    const margin = 5;
    const counts = ['2', '4', '8'];
    const faces = ['-X', '+X', '-Y', '+Y'];

    for (const count of counts) {
      const total = Number(count);
      const span = 54.4 - margin * 2 - clipWidth;
      const pitch = span / (total - 1);
      for (const face of faces) {
        const probes = Array.from({ length: total }, (_, index) => {
          const along = boardStart + margin + pitch * index;
          if (face === '-X') return `box(5, 0.85, 1.2).translate(${along}, 2.55, 6.6)`;
          if (face === '+X') return `box(5, 0.85, 1.2).translate(${along}, 29.6, 6.6)`;
          if (face === '-Y') return `box(0.85, 5, 1.2).translate(2.55, ${along}, 6.6)`;
          return `box(0.85, 5, 1.2).translate(29.6, ${along}, 6.6)`;
        });
        const unionProbe = probes.slice(1).reduce((expression, probe) => `${expression}.union(${probe})`, probes[0]);
        expect(await intersectionVolume(unionProbe, face, count), `${face}, ${count} clips`).toBeGreaterThan(total * 0.5);
      }
    }
  }, 180_000);

  it('supports the catches in the board-edge clearance without intersecting the board', async () => {
    const lowerSupport = 'box(5, 0.35, 4.6).translate(7.55, 2.2, 2)';
    const upperSupport = 'box(5, 0.35, 4.6).translate(7.55, 30.45, 2)';
    expect(await intersectionVolume(lowerSupport)).toBeGreaterThan(0.1);
    expect(await intersectionVolume(upperSupport)).toBeGreaterThan(0.1);
    await expectNoIntersection('box(54.4, 27.9, 1.6).translate(2.55, 2.55, 5)');
  }, 180_000);

  it('cuts the connector opening through the selected outer face and leaves the wall beside it', async () => {
    const cases = [
      { face: '-X', opening: 'box(2.2, 8, 1).translate(0, 12.5, 6.6)', wall: 'box(2.2, 1, 1).translate(0, 21, 6.6)' },
      { face: '+X', opening: 'box(2.2, 8, 1).translate(57.3, 12.5, 6.6)', wall: 'box(2.2, 1, 1).translate(57.3, 21, 6.6)' },
      { face: '-Y', opening: 'box(8, 2.2, 1).translate(12.5, 0, 6.6)', wall: 'box(1, 2.2, 1).translate(0, 0, 6.6)' },
      { face: '+Y', opening: 'box(8, 2.2, 1).translate(12.5, 30.8, 6.6)', wall: 'box(1, 2.2, 1).translate(0, 30.8, 6.6)' },
    ];
    for (const item of cases) {
      await expectNoIntersection(item.opening, item.face);
      expect(await intersectionVolume(item.wall, item.face), item.face).toBeGreaterThan(0.1);
    }
  }, 180_000);

  it('slides connector access along the selected edge while zero stays centered', async () => {
    // 54.4 mm long board: +12 mm moves the 8 mm opening toward the far end.
    // -Y rotates canonical +Y offset into negative X; +Y rotates it into +X.
    const cases = [
      { face: '-X', opening: 'box(2.2, 8, 1).translate(0, 24.5, 6.6)' },
      { face: '+X', opening: 'box(2.2, 8, 1).translate(57.3, 24.5, 6.6)' },
      { face: '-Y', opening: 'box(8, 2.2, 1).translate(0.5, 0, 6.6)' },
      { face: '+Y', opening: 'box(1, 2.2, 1).translate(28, 30.8, 6.6)' },
    ];
    for (const item of cases) {
      await expectNoIntersection(item.opening, item.face, 12);
    }
    // Center remains the default; current centered opening probes above also
    // verify backwards-compatible behavior.
  }, 180_000);

  it('keeps each selected opening aligned with the corresponding board connector edge', async () => {
    const expected = {
      '-X': { size: [59.5, 33], board: [54.4, 27.9], origin: [2.55, 2.55] },
      '+X': { size: [59.5, 33], board: [54.4, 27.9], origin: [2.55, 2.55] },
      '-Y': { size: [33, 59.5], board: [27.9, 54.4], origin: [2.55, 2.55] },
      '+Y': { size: [33, 59.5], board: [27.9, 54.4], origin: [2.55, 2.55] },
    } as const;
    for (const face of Object.keys(expected) as Array<keyof typeof expected>) {
      const { evaluation, model } = await buildForFace(face);
      expect(evaluation.exitCode, `${face}: ${JSON.stringify(evaluation.diagnostics)}`).toBe(0);
      const bbox = model!.rootShape!.boundingBox();
      expect(bbox.max[0] - bbox.min[0]).toBeCloseTo(expected[face].size[0], 1);
      expect(bbox.max[1] - bbox.min[1]).toBeCloseTo(expected[face].size[1], 1);
      const boardProbe = face === '-Y' || face === '+Y'
        ? `box(${expected[face].board[0]}, ${expected[face].board[1]}, 1.6).translate(${expected[face].origin[1]}, ${expected[face].origin[0]}, 5)`
        : `box(${expected[face].board[0]}, ${expected[face].board[1]}, 1.6).translate(${expected[face].origin[0]}, ${expected[face].origin[1]}, 5)`;
      await expectNoIntersection(boardProbe, face);

      // A connector-sized prism extends outward from the selected board edge
      // through the centered opening. The adjacent wall remains present beside it.
      const outerGap = face === '-X' ? 'box(2, 8, 1).translate(-2, 12.5, 6.6)'
        : face === '+X' ? 'box(2, 8, 1).translate(59.5, 12.5, 6.6)'
          : face === '-Y' ? 'box(8, 2, 1).translate(12.5, -2, 6.6)'
            : 'box(8, 2, 1).translate(12.5, 57.5, 6.6)';
      await expectNoIntersection(outerGap, face);
    }
  }, 180_000);

  it('is discoverable for a generic board cradle with connector access', async () => {
    const result = await lookupCookbookTool({ query: 'hole-less PCB development board cradle rail snap clips USB connector opening' });
    expect(result.ok).toBe(true);
    expect(result.hits!.slice(0, 3).map((hit) => hit.id)).toContain('holeless-board-cradle');
  });

  it('executes the cradle cookbook through the MCP tool', async () => {
    const result = await executeCookbookTool({ id: 'holeless-board-cradle' });
    expect(result.ok, JSON.stringify(result.evaluate?.diagnostics)).toBe(true);
    expect(result.cookbookId).toBe('holeless-board-cradle');
    expect(result.evaluate?.ok).toBe(true);
    expect(result.code).toContain('pinClearance');
  }, 180_000);
});
