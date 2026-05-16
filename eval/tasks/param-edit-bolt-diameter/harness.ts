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
  const update = await run.session.params.update([{ name: 'boltDia', value: 6 }]);
  const editedVolume = update.shape.volume();

  const records = run.session.getRecords();
  const box = records.find(r => r.kind === 'box');
  const holes = records.find(r => r.kind === 'holes');
  const fillet = records.find(r => r.kind === 'fillet');
  const boltEntry = run.session.paramTable.get('boltDia');
  const holesRefs = (holes?.metadata as { paramRefs?: string[] } | undefined)?.paramRefs ?? [];

  return {
    gates: {
      'evaluates clean': true,
      'returns lowerable shape': true,
      'declares boltDia param': boltEntry.type === 'number' && boltEntry.defaultValue === 5,
      'holes consume boltDia ParamRef': holesRefs.includes('boltDia'),
    },
    scored: {
      'editing boltDia changes geometry': editedVolume < initialVolume,
      'box reused from cache': box !== undefined && update.skipped.includes(box.id),
      'holes re-lowered': holes !== undefined && update.relowered.includes(holes.id),
      'downstream fillet re-lowered': fillet !== undefined && update.relowered.includes(fillet.id),
      'update produced no warnings': update.warnings.length === 0,
    },
  };
}
