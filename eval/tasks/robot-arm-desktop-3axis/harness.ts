import { readFileSync } from 'node:fs';
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';
import type { HarnessResult } from '../../types';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  const dims = [
    s.bbox.max[0] - s.bbox.min[0],
    s.bbox.max[1] - s.bbox.min[1],
    s.bbox.max[2] - s.bbox.min[2],
  ];
  const maxDim = Math.max(...dims);

  const src = readFileSync(scriptPath, 'utf8');
  const revoluteCount = (src.match(/\.revolute\s*\(/g) ?? []).length;
  const colorCalls = (src.match(/\.color\s*\(/g) ?? []).length;
  const partCalls = (src.match(/\.part\s*\(/g) ?? []).length;
  const featureCount = ev.featureCount ?? 0;

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      '3 revolute joints declared': revoluteCount >= 3,
      'mechanical density (>= 8 parts on assembly)': partCalls >= 8,
      'role colors applied (>= 6 .color calls)': colorCalls >= 6,
      'feature count >= 12': featureCount >= 12,
      'arm reaches (max dim > 100mm)': maxDim > 100,
      'arm not gigantic (max dim < 600mm)': maxDim < 600,
    },
  };
}
