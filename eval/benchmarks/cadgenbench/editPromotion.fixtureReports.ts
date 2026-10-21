// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Loader for the real STEP inspection reports used by the fixture-backed edit
// promotion tests. The reports come from `kernelcad inspect step` on the
// benchmark input and on the exported candidate, so the tests exercise the
// production report shape rather than a hand-written approximation.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StepInspectReport } from '../../../src/kernel/import/inspectStep';

const FIXTURE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/promotion');

export function inspectedFixture(name: string): StepInspectReport {
  const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), 'utf8')) as
    | StepInspectReport
    | { report: StepInspectReport };
  return 'report' in raw ? raw.report : raw;
}
