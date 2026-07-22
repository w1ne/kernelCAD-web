// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runScript } from '../src/modeling/runtime/runScript';
import {
  AUTHORED_ELECTRONIC_PACKAGE_SPECS,
  verifyAuthoredElectronicsCatalog,
} from './verifyAuthoredElectronicsCatalog';

const repoRoot = resolve(__dirname, '..');
const manifestPath = join(repoRoot, 'scripts/electronics-parts.json');
const tempDirs: string[] = [];

function makeCatalogFixture(): string {
  const catalogDir = mkdtempSync(join(tmpdir(), 'kc-authored-electronics-catalog-'));
  tempDirs.push(catalogDir);
  mkdirSync(join(catalogDir, 'step'), { recursive: true });
  mkdirSync(join(catalogDir, 'v1', 'parts'), { recursive: true });
  mkdirSync(join(catalogDir, 'v1', 'catalog'), { recursive: true });

  const records = AUTHORED_ELECTRONIC_PACKAGE_SPECS.map((spec) => {
    const step = Buffer.from(`ISO-10303-21;\nDATA;\n/* ${spec.id} */\nENDSEC;\nEND-ISO-10303-21;\n`);
    const sha256 = createHash('sha256').update(step).digest('hex');
    writeFileSync(join(catalogDir, 'step', `${spec.id}.step`), step);
    const record = {
      id: spec.id,
      name: spec.id,
      category: 'Electronics',
      family: 'fixture',
      tags: ['electronics'],
      attributes: {
        bboxXmm: spec.bboxMm[0],
        bboxYmm: spec.bboxMm[1],
        bboxZmm: spec.bboxMm[2],
        package: spec.package,
        pinCount: spec.pinCount,
        ...(spec.pinPitchMm === undefined ? {} : { pinPitchMm: spec.pinPitchMm }),
      },
      stepUrl: `https://parts.example/step/${spec.id}.step`,
      sha256,
      byteSize: step.length,
      license: 'MIT',
      connectors: [],
    };
    writeFileSync(
      join(catalogDir, 'v1', 'parts', `${spec.id}.json`),
      JSON.stringify(record, null, 2),
    );
    return record;
  });

  writeFileSync(
    join(catalogDir, 'v1', 'catalog', 'parts.index.json'),
    JSON.stringify({ catalog: { partCount: records.length }, items: records }, null, 2),
  );
  return catalogDir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

async function assemblyPartBoxZBounds(
  sourcePath: string,
  partName: string,
): Promise<{ min: number; max: number }> {
  const records = (await runScript({
    code: readFileSync(sourcePath, 'utf8'),
    fileName: sourcePath,
    scriptDir: dirname(sourcePath),
  })).records;
  const assemblyPart = records.find(
    (record) => record.kind === 'assemblyPart' && record.metadata?.partName === partName,
  );
  const input = assemblyPart?.inputs.shape;
  if (!assemblyPart || input?.kind !== 'feature') {
    throw new Error(`missing assembly part '${partName}'`);
  }
  const box = records.find((record) => record.id === input.id);
  if (!box || box.kind !== 'box') {
    throw new Error(`assembly part '${partName}' is not backed by a box`);
  }
  const height = evaluated(box.params.z);
  if (height === undefined) throw new Error(`assembly part '${partName}' has no box height`);
  const centered = evaluated(box.params.centered) === 1;
  let min = centered ? -height / 2 : 0;
  let max = centered ? height / 2 : height;
  for (const transform of box.transforms) {
    if (transform.op !== 'translate') {
      throw new Error(`assembly part '${partName}' has a non-translate transform`);
    }
    const z = evaluated(transform.vec.z);
    if (z === undefined) throw new Error(`assembly part '${partName}' has an unresolved Z transform`);
    min += z;
    max += z;
  }
  return { min, max };
}

function evaluated(value: unknown): number | undefined {
  return typeof value === 'object' && value !== null &&
    typeof (value as { evaluated?: unknown }).evaluated === 'number'
    ? (value as { evaluated: number }).evaluated
    : undefined;
}

describe('verifyAuthoredElectronicsCatalog', () => {
  it('keeps MAX30102 optical apertures non-overlapping in the physical assembly', () => {
    const output = execFileSync(
      process.execPath,
      ['dist/cli/index.js', 'interference', 'scripts/parts/authored/max30102-optical.kcad.ts'],
      { cwd: repoRoot, encoding: 'utf8' },
    );

    expect(output).toContain('No interferences');
  });

  it('keeps MAX30102 underside solder contacts outside its package body', async () => {
    const sourcePath = join(repoRoot, 'scripts/parts/authored/max30102-optical.kcad.ts');
    const body = await assemblyPartBoxZBounds(sourcePath, 'package-body');
    const contact = await assemblyPartBoxZBounds(sourcePath, 'contact-bottom-01');

    expect(body.min).toBeGreaterThanOrEqual(contact.max - 0.001);
  });

  it('requires all authored universal packages to be emitted with measured bounds and named component/contact structure', async () => {
    const catalogDir = makeCatalogFixture();

    await expect(
      verifyAuthoredElectronicsCatalog({ catalogDir, manifestPath }),
    ).resolves.toEqual({ verifiedIds: AUTHORED_ELECTRONIC_PACKAGE_SPECS.map((spec) => spec.id) });
  });

  it('fails before deploy when one authored package was skipped', async () => {
    const catalogDir = makeCatalogFixture();
    const missing = AUTHORED_ELECTRONIC_PACKAGE_SPECS[0];
    rmSync(join(catalogDir, 'step', `${missing.id}.step`));

    await expect(
      verifyAuthoredElectronicsCatalog({ catalogDir, manifestPath }),
    ).rejects.toThrow(new RegExp(`${missing.id}.*STEP artifact`, 'i'));
  });
});
