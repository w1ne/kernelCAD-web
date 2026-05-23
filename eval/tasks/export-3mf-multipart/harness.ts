// eval/tasks/export-3mf-multipart/harness.ts
//
// Round-trip gate for the Slice A 3MF writer: run the candidate script
// through the runtime's 3MF export path, unzip the bytes back with
// `fflate`, and parse `3D/3dmodel.model` to assert the OPC layout +
// per-part identity (one `<object>` per part with the expected color).

import { readFileSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { evaluateScript } from '../../oracle/kernelcad-client';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { HarnessResult } from '../../types';

const EXPECTED_PARTS = [
  { name: 'plate', color: '#888888' },
  { name: 'bracket', color: '#cc4444' },
  { name: 'cap', color: '#4488cc' },
] as const;

function colorAttrFor(model: string, partName: string): string | undefined {
  const re = new RegExp(
    `<base\\s+name="${partName}"\\s+displaycolor="(#[0-9a-fA-F]{8})"`,
  );
  const m = model.match(re);
  return m ? m[1].toUpperCase() : undefined;
}

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  await initOcct();
  const code = readFileSync(scriptPath, 'utf8');
  const result = await runAndExport({ code, fileName: scriptPath, format: '3mf' });
  const noErrors = result.diagnostics.filter(d => d.severity === 'error').length === 0;
  if (!noErrors || result.bytes.length === 0) {
    return {
      gates: { 'evaluates clean': true, '3MF writer emits bytes': false },
      scored: {},
    };
  }

  let entries: Record<string, Uint8Array> | undefined;
  try {
    entries = unzipSync(result.bytes);
  } catch {
    entries = undefined;
  }
  if (!entries) {
    return {
      gates: {
        'evaluates clean': true,
        '3MF writer emits bytes': true,
        '3MF zip re-unpacks': false,
      },
      scored: {},
    };
  }

  const hasContentTypes = !!entries['[Content_Types].xml'];
  const hasRels = !!entries['_rels/.rels'];
  const modelBytes = entries['3D/3dmodel.model'];
  const hasModel = !!modelBytes;
  if (!hasModel) {
    return {
      gates: {
        'evaluates clean': true,
        '3MF writer emits bytes': true,
        '3MF zip re-unpacks': true,
        '3D/3dmodel.model present': false,
      },
      scored: {},
    };
  }

  const model = strFromU8(modelBytes);
  const objects = model.match(/<object\b/g) ?? [];
  const objectsOk = objects.length === EXPECTED_PARTS.length;
  const unitMm = /<model[^>]*unit="millimeter"/.test(model);
  const colors = EXPECTED_PARTS.map(p => ({
    name: p.name,
    expected: `${p.color.toUpperCase()}FF`,
    actual: colorAttrFor(model, p.name),
  }));
  const colorsOk = colors.every(c => c.actual === c.expected);

  return {
    gates: {
      'evaluates clean': true,
      '3MF writer emits bytes': true,
      '3MF zip re-unpacks': true,
      '3D/3dmodel.model present': true,
      '[Content_Types].xml present': hasContentTypes,
      '_rels/.rels present': hasRels,
      '3 <object> entries (one per part)': objectsOk,
      'document unit="millimeter"': unitMm,
    },
    scored: {
      'per-part displaycolor matches role hex': colorsOk,
    },
  };
}
