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

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export function parsePortfolioMeta(raw: unknown): PortfolioMeta {
  if (!raw || typeof raw !== 'object') throw new Error('portfolio meta: not an object');
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
  if (!PORTFOLIO_CATEGORIES.includes(r.category as PortfolioCategory)) {
    throw new Error(`portfolio meta: unknown category '${String(r.category)}'`);
  }
  if (!PORTFOLIO_DIFFICULTIES.includes(r.difficulty as PortfolioDifficulty)) {
    throw new Error(`portfolio meta: unknown difficulty '${String(r.difficulty)}'`);
  }
  if (typeof r.builtAt !== 'string' || !ISO_RE.test(r.builtAt)) {
    throw new Error(`portfolio meta: builtAt must be ISO 8601 UTC, got '${String(r.builtAt)}'`);
  }
  const ah = r.artifactHashes as { step?: unknown; stl?: unknown } | undefined;
  if (!ah || typeof ah.step !== 'string' || typeof ah.stl !== 'string') {
    throw new Error('portfolio meta: artifactHashes.step and .stl must be strings');
  }
  return r as unknown as PortfolioMeta;
}

export function writePortfolioMeta(targetPath: string, meta: PortfolioMeta): void {
  parsePortfolioMeta(meta);
  writeFileSync(targetPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}
