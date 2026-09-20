// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { spawn as nodeSpawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZERO_CATEGORIES, type JudgeCategories } from '../eval/lib/museAggregate';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WRAPPER_PY = resolve(__dirname, '../eval/oracle/museJudgeWrapper.py');

export interface JudgeCaseArgs {
  caseName: string;
  datasetCaseDir: string;
  candidatePng: string;
  outPath: string;
  museRoot: string;
  pythonBin: string;
  baseUrl: string;
  model: string;
  timeoutMs?: number;
}

export interface JudgeResult {
  overall: number;
  categories: JudgeCategories;
  forcedZero: boolean;
  forcedZeroReason?: string;
  summary?: string;
}

type SpawnFn = typeof nodeSpawn;

const CATEGORY_KEYS: Record<string, keyof JudgeCategories> = {
  'assembly readiness': 'assembly_readiness',
  'joint design': 'joint_design',
  tolerance: 'tolerance',
  'functional adaptation': 'functional_adaptation',
  'usage stability': 'usage_stability',
  manufacturability: 'manufacturability',
};

export function mapJudgePayload(payload: Record<string, unknown>): {
  overall: number;
  categories: JudgeCategories;
  summary: string;
} {
  const categories: JudgeCategories = { ...ZERO_CATEGORIES };
  const items = Array.isArray(payload.items) ? payload.items : [];
  for (const raw of items) {
    const item = raw as { category_en?: unknown; score?: unknown };
    const key = CATEGORY_KEYS[String(item.category_en ?? '').trim().toLowerCase()];
    if (!key) continue;
    const score = Number(item.score ?? 0);
    categories[key] = Number.isFinite(score) && score >= 0.5 ? 1 : 0;
  }
  let overall = Number(payload.overall ?? payload.overall_score_normalized ?? 0);
  if (!Number.isFinite(overall) || overall <= 0) {
    const values = Object.values(categories);
    overall = values.reduce((a, b) => a + b, 0) / 6;
  }
  return { overall, categories, summary: String(payload.summary ?? '') };
}

function runWrapper(
  args: JudgeCaseArgs,
  spawnFn: SpawnFn,
): Promise<Record<string, unknown>> {
  return new Promise((resolvePromise, reject) => {
    const child = spawnFn(
      args.pythonBin,
      [
        WRAPPER_PY,
        '--muse-root', args.museRoot,
        '--case-name', args.caseName,
        '--case-dir', args.datasetCaseDir,
        '--candidate-png', args.candidatePng,
        '--out', args.outPath,
        '--model', args.model,
        '--base-url', args.baseUrl,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      const line = stdout
        .split('\n')
        .map((l) => l.trim())
        .reverse()
        .find((l) => l.startsWith('{'));
      if (!line) {
        reject(new Error(`judge wrapper exited ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (typeof parsed.error === 'string') {
        reject(new Error(parsed.error));
        return;
      }
      resolvePromise(parsed);
    });
  });
}

export async function judgeCase(
  args: JudgeCaseArgs,
  stage12Ok: boolean,
  spawnFn: SpawnFn = nodeSpawn,
): Promise<JudgeResult> {
  mkdirSync(dirname(args.outPath), { recursive: true });
  if (!stage12Ok) {
    const result: JudgeResult = {
      overall: 0,
      categories: { ...ZERO_CATEGORIES },
      forcedZero: true,
      forcedZeroReason:
        'stage 1 sandbox or stage 2 overlap failed; MUSE forces all categories to 0',
    };
    writeFileSync(args.outPath, JSON.stringify(result, null, 2));
    return result;
  }
  const payload = await runWrapper(args, spawnFn);
  const mapped = mapJudgePayload(payload);
  const result: JudgeResult = {
    overall: mapped.overall,
    categories: mapped.categories,
    forcedZero: false,
    summary: mapped.summary,
  };
  writeFileSync(args.outPath, JSON.stringify({ ...result, raw: payload }, null, 2));
  return result;
}
