// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { evaluateScript } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';
import { runScript } from '../../../src/modeling/runtime/runScript';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const source = readFileSync(scriptPath, 'utf8');
  const run = await runScript({ code: source, fileName: scriptPath });
  const returned = run.returnValue as { lower?: () => Promise<{ volume: () => number }> };
  if (!returned || typeof returned.lower !== 'function') {
    return { gates: { 'evaluates clean': true, 'returns lowerable shape': false }, scored: {} };
  }

  const initialShape = await returned.lower();
  const initialVolume = initialShape.volume();
  const update = await run.session.params.update([{ name: 'addCablePort', value: false }]);
  const gatedVolume = update.shape.volume();

  const records = run.session.getRecords();
  const box = records.find(r => r.kind === 'box');
  const sketch = records.find(r => r.kind === 'sketch');
  const cutout = records.find(r => r.kind === 'cutout');
  const fillet = records.find(r => r.kind === 'fillet');
  const boolEntry = run.session.paramTable.get('addCablePort');
  const cutoutRefs = (cutout?.metadata as { paramRefs?: string[] } | undefined)?.paramRefs ?? [];
  const warning = update.warnings[0];

  return {
    gates: {
      'evaluates clean': true,
      'returns lowerable shape': true,
      'declares addCablePort boolean param': boolEntry.type === 'boolean' && boolEntry.defaultValue === true,
      'cutout enabled consumes addCablePort ParamRef': cutoutRefs.includes('addCablePort'),
    },
    scored: {
      'gating off removes the cutout': gatedVolume > initialVolume,
      'box reused from cache': box !== undefined && update.skipped.includes(box.id),
      'profile sketch reused from cache': sketch !== undefined && update.skipped.includes(sketch.id),
      'cutout re-lowered': cutout !== undefined && update.relowered.includes(cutout.id),
      'downstream fillet re-lowered': fillet !== undefined && update.relowered.includes(fillet.id),
      'soft warning reports gated face ref':
        update.warnings.length === 1 &&
        warning.code === 'feature.face-ref.not-resolvable' &&
        warning.hint === 'face-ref.skipped-by-param' &&
        warning.paramName === 'addCablePort',
    },
  };
}
