// scripts/lib/portfolioMeta.ts
import { writeFileSync } from 'node:fs';

export const PORTFOLIO_CATEGORIES = [
  'bracket', 'mount', 'fixture', 'enclosure', 'fastener',
  'gear', 'tooling', 'arm-part', 'misc',
] as const;
export type PortfolioCategory = (typeof PORTFOLIO_CATEGORIES)[number];

export const PORTFOLIO_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type PortfolioDifficulty = (typeof PORTFOLIO_DIFFICULTIES)[number];

export interface PortfolioMeta {
  schemaVersion: 1;
  slug: string;
  category: PortfolioCategory;
  difficulty: PortfolioDifficulty;
  /** Public URL of the engineer's original ask (issue, thread, post). */
  sourceUrl: string;
  /** SPDX license identifier of the source thread, or 'unknown' if not declared. */
  sourceLicense: string;
  /** Short paraphrase of the engineer's request. NOT a verbatim copy. */
  paraphrasedPrompt: string;
  /** Model that produced the build (e.g. 'claude-opus-4-7'). */
  model: string;
  /** How many agent attempts before this version. 1 = first try success. */
  attemptCount: number;
  /** ISO 8601 UTC timestamp of the successful build. */
  builtAt: string;
  /** sha256 hashes of the exported artifacts, used for reproducibility checks. */
  artifactHashes: { step: string; stl: string };
}

const SHA256_RE = /^sha256:[0-9a-f]{64}$/;

export function parsePortfolioMeta(raw: unknown): PortfolioMeta {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('portfolio meta: not an object');
  }
  const r = raw as Record<string, unknown>;
  const required: Array<keyof PortfolioMeta> = [
    'schemaVersion', 'slug', 'category', 'difficulty', 'sourceUrl',
    'sourceLicense', 'paraphrasedPrompt', 'model', 'attemptCount',
    'builtAt', 'artifactHashes',
  ];
  for (const k of required) {
    if (!(k in r)) throw new Error(`portfolio meta: missing required field '${k}'`);
  }
  if (r.schemaVersion !== 1) throw new Error('portfolio meta: schemaVersion must be 1');
  for (const k of ['slug', 'sourceUrl', 'sourceLicense', 'paraphrasedPrompt', 'model'] as const) {
    if (typeof r[k] !== 'string' || (r[k] as string).length === 0) {
      throw new Error(`portfolio meta: '${k}' must be a non-empty string`);
    }
  }
  if (!PORTFOLIO_CATEGORIES.includes(r.category as PortfolioCategory)) {
    throw new Error(`portfolio meta: unknown category '${String(r.category)}'`);
  }
  if (!PORTFOLIO_DIFFICULTIES.includes(r.difficulty as PortfolioDifficulty)) {
    throw new Error(`portfolio meta: unknown difficulty '${String(r.difficulty)}'`);
  }
  if (typeof r.attemptCount !== 'number'
    || !Number.isInteger(r.attemptCount)
    || (r.attemptCount as number) < 1) {
    throw new Error(`portfolio meta: attemptCount must be a positive integer, got '${String(r.attemptCount)}'`);
  }
  if (typeof r.builtAt !== 'string') {
    throw new Error(`portfolio meta: builtAt must be ISO 8601 UTC, got '${String(r.builtAt)}'`);
  }
  const isoStr = r.builtAt;
  const parsed = new Date(isoStr);
  // Real ISO check: Date round-trips to the same string. Tolerate the
  // "no fractional seconds" variant by re-checking after stripping .NNNZ.
  if (Number.isNaN(parsed.getTime())
    || (parsed.toISOString() !== isoStr
      && parsed.toISOString().replace(/\.\d+Z$/, 'Z') !== isoStr)) {
    throw new Error(`portfolio meta: builtAt must be a real ISO 8601 UTC timestamp, got '${isoStr}'`);
  }
  const ah = r.artifactHashes as { step?: unknown; stl?: unknown } | undefined;
  if (!ah || typeof ah !== 'object'
    || typeof ah.step !== 'string' || typeof ah.stl !== 'string') {
    throw new Error('portfolio meta: artifactHashes.step and .stl must be strings');
  }
  if (!SHA256_RE.test(ah.step) || !SHA256_RE.test(ah.stl)) {
    throw new Error('portfolio meta: artifactHashes.step and .stl must match sha256:[0-9a-f]{64}');
  }
  return r as unknown as PortfolioMeta;
}

export function writePortfolioMeta(targetPath: string, meta: PortfolioMeta): void {
  parsePortfolioMeta(meta);
  writeFileSync(targetPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}
