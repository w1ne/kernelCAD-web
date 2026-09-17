// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectFindings, listSourceFiles, planRegen, type Finding } from './lib/qualityRatchet';
import { collectCyclesDetailed, planCycleRegen } from './lib/cycleRatchet';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const allowNew = process.argv.includes('--allow-new');

function readJsonIfExists<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

const qualityBaselinePath = resolve(root, 'scripts/lib/qualityBaseline.json');
const cycleBaselinePath = resolve(root, 'scripts/lib/cycleBaseline.json');

const existingFindings = readJsonIfExists<Finding[]>(qualityBaselinePath);
const existingCycles = readJsonIfExists<string[]>(cycleBaselinePath);

const findings = await collectFindings(root, listSourceFiles(root));
const { cycles, skipped } = await collectCyclesDetailed(root, 'tsconfig.app.json');

const findingsPlan = planRegen(findings, existingFindings, allowNew);
const cyclesPlan = planCycleRegen(cycles, existingCycles, allowNew);

let failed = false;

if (findingsPlan.report.length > 0) {
  for (const line of findingsPlan.report) console.log(line);
}
if (!findingsPlan.write) {
  console.error(
    'qualityBaseline.json: refusing to write — new/grown findings present. Pass --allow-new to override.',
  );
  failed = true;
} else {
  writeFileSync(qualityBaselinePath, JSON.stringify(findings, null, 2) + '\n');
  console.log(`qualityBaseline.json: ${findings.length} findings`);
}

if (cyclesPlan.report.length > 0) {
  for (const line of cyclesPlan.report) console.log(line);
}
if (!cyclesPlan.write) {
  console.error('cycleBaseline.json: refusing to write — new cycles present. Pass --allow-new to override.');
  failed = true;
} else {
  writeFileSync(cycleBaselinePath, JSON.stringify(cycles, null, 2) + '\n');
  console.log(`cycleBaseline.json: ${cycles.length} cycles`);
}

if (skipped.length > 0) {
  console.log(`madge skipped modules: ${skipped.join(', ')}`);
}

if (failed) process.exit(1);
