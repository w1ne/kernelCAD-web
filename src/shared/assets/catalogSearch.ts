// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/assets/catalogSearch.ts
//
// Pure queries over the asset catalog index: search with an honest coverage
// verdict, "what goes with this" matching, and plain-words variant requests.
// No I/O, so the hosted API, the MCP tools and tests share one behaviour.

import type { CatalogAsset, CatalogIndex, CatalogParam } from './catalogSchema';
import type { AssetCategory } from './assetSchema';

export type SearchCoverage = 'none' | 'poor' | 'ok' | 'filtered_out';

export interface CatalogSearchQuery {
  readonly q?: string;
  readonly kit?: string;
  readonly category?: AssetCategory;
  readonly maxTriangles?: number;
  readonly minTriangles?: number;
  readonly sort?: 'relevance' | 'triangles';
  readonly limit?: number;
  readonly offset?: number;
}

export interface CatalogSearchResult {
  readonly total: number;
  readonly rows: CatalogAsset[];
  /** Present when a query or a filter was given. */
  readonly coverage?: SearchCoverage;
  /** Query words no asset mentions. */
  readonly unmatchedTerms: string[];
  /** Rows the query matched before kit/category/triangle filters. */
  readonly matchesBeforeFilters: number;
}

const STOP_WORDS = new Set(['a', 'an', 'the', 'of', 'for', 'with', 'and', 'or', 'in', 'on', 'to', 'low', 'poly', 'lowpoly', 'model', 'asset', '3d']);

export function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9#]+/).filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/** Crude English singular so "trees" finds "tree" and "benches" finds "bench". */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(ch|sh|x|s)es$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

interface FieldWeights { readonly tokens: Set<string>; readonly weight: number }

function assetFields(asset: CatalogAsset): FieldWeights[] {
  const set = (texts: string[]): Set<string> => new Set(texts.flatMap(tokenize).map(stem));
  return [
    { tokens: set([asset.id, asset.title]), weight: 5 },
    { tokens: set(asset.tags), weight: 4 },
    { tokens: set([asset.category, asset.kit, ...asset.compat]), weight: 2 },
    { tokens: set([asset.description, ...asset.params.map((p) => `${p.name} ${p.label ?? ''}`)]), weight: 1 },
  ];
}

function scoreAsset(asset: CatalogAsset, terms: readonly string[]): { score: number; hits: Set<string> } {
  const fields = assetFields(asset);
  let score = 0;
  const hits = new Set<string>();
  for (const term of terms) {
    const best = Math.max(0, ...fields.filter((f) => f.tokens.has(term)).map((f) => f.weight));
    if (best > 0) hits.add(term);
    score += best;
  }
  return { score, hits };
}

function passesFilters(asset: CatalogAsset, query: CatalogSearchQuery): boolean {
  if (query.kit !== undefined && asset.kit !== query.kit) return false;
  if (query.category !== undefined && asset.category !== query.category) return false;
  if (query.maxTriangles !== undefined && asset.stats.triangles > query.maxTriangles) return false;
  if (query.minTriangles !== undefined && asset.stats.triangles < query.minTriangles) return false;
  return true;
}

function hasFilters(query: CatalogSearchQuery): boolean {
  return query.kit !== undefined || query.category !== undefined
    || query.maxTriangles !== undefined || query.minTriangles !== undefined;
}

function searchCoverage(
  query: CatalogSearchQuery,
  terms: readonly string[],
  matchedCount: number,
  filtered: ReadonlyArray<{ hits: Set<string> }>,
  unmatchedCount: number,
): SearchCoverage | undefined {
  if (terms.length === 0 && !hasFilters(query)) return undefined;
  if (matchedCount === 0) return 'none';
  if (filtered.length === 0) return 'filtered_out';
  const bestHits = Math.max(0, ...filtered.map((row) => row.hits.size));
  return unmatchedCount > 0 || bestHits * 2 < terms.length ? 'poor' : 'ok';
}

/**
 * Search the catalog. With a query, an asset must answer at least one term;
 * rows rank by field-weighted term hits. `coverage` tells the caller whether
 * to trust the answer: `none` (nothing answers), `poor` (some words are
 * answered by nothing, or the best row answers under half of them), `ok`, or
 * `filtered_out` (the catalog has it and a filter removed it).
 */
export function searchCatalog(index: CatalogIndex, query: CatalogSearchQuery = {}): CatalogSearchResult {
  const terms = [...new Set(tokenize(query.q ?? '').map(stem))];
  const scored = index.assets.map((asset) => ({ asset, ...scoreAsset(asset, terms) }));
  const matched = terms.length === 0 ? scored : scored.filter((row) => row.score > 0);
  const answered = new Set(matched.flatMap((row) => [...row.hits]));
  const unmatchedTerms = terms.filter((term) => !answered.has(term));
  const filtered = matched.filter((row) => passesFilters(row.asset, query));

  filtered.sort(query.sort === 'triangles'
    ? (a, b) => a.asset.stats.triangles - b.asset.stats.triangles || a.asset.id.localeCompare(b.asset.id)
    : (a, b) => b.score - a.score || a.asset.id.localeCompare(b.asset.id));
  const offset = query.offset ?? 0;
  const rows = filtered.slice(offset, offset + (query.limit ?? 20)).map((row) => row.asset);

  const coverage = searchCoverage(query, terms, matched.length, filtered, unmatchedTerms.length);
  return {
    total: filtered.length,
    rows,
    ...(coverage === undefined ? {} : { coverage }),
    unmatchedTerms,
    matchesBeforeFilters: matched.length,
  };
}

// ---------------------------------------------------------------------------
// Matching

export interface MatchingQuery {
  readonly limit?: number;
  readonly maxTriangles?: number;
}

export interface MatchingRow {
  readonly asset: CatalogAsset;
  readonly score: number;
  /** Why it matched: 'same-kit', 'compat:<tag>', 'palette', 'scale'. */
  readonly reasons: string[];
}

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function sharesPalette(a: CatalogAsset, b: CatalogAsset): boolean {
  return a.palette.some((za) => b.palette.some((zb) => colorDistance(za.color, zb.color) < 40));
}

/** Both assets plausibly share a scene at real-world scale (largest sides within 25x). */
function scaleCompatible(a: CatalogAsset, b: CatalogAsset): boolean {
  const big = (asset: CatalogAsset) => Math.max(...asset.stats.sizeM);
  const ratio = big(a) / Math.max(big(b), 1e-6);
  return ratio > 1 / 25 && ratio < 25;
}

/**
 * Assets that belong in a scene with `id`: same kit first, then shared
 * compat tags, then a shared palette colour, then compatible real-world
 * scale. Results are spread across categories (round-robin by category in
 * score order) so a tree brings a rock, a bench and a lamp rather than five
 * trees. Returns `undefined` when `id` is not in the catalog.
 */
export function findMatching(index: CatalogIndex, id: string, query: MatchingQuery = {}): MatchingRow[] | undefined {
  const anchor = index.assets.find((asset) => asset.id === id);
  if (anchor === undefined) return undefined;
  const candidates = index.assets
    .filter((asset) => asset.id !== id
      && (query.maxTriangles === undefined || asset.stats.triangles <= query.maxTriangles))
    .map((asset) => matchRow(anchor, asset))
    .filter((row) => row.score > 1)
    .sort((a, b) => b.score - a.score || a.asset.id.localeCompare(b.asset.id));
  return spreadByCategory(candidates).slice(0, query.limit ?? 12);
}

function matchRow(anchor: CatalogAsset, asset: CatalogAsset): MatchingRow {
  const reasons: string[] = [];
  let score = 0;
  if (asset.kit === anchor.kit) { score += 8; reasons.push('same-kit'); }
  for (const tag of asset.compat.filter((t) => anchor.compat.includes(t))) { score += 2; reasons.push(`compat:${tag}`); }
  if (sharesPalette(anchor, asset)) { score += 1; reasons.push('palette'); }
  if (scaleCompatible(anchor, asset)) { score += 1; reasons.push('scale'); }
  return { asset, score, reasons };
}

/** Round-robin over categories, keeping score order inside each. */
function spreadByCategory(rows: readonly MatchingRow[]): MatchingRow[] {
  const queues = new Map<string, MatchingRow[]>();
  for (const row of rows) queues.set(row.asset.category, [...(queues.get(row.asset.category) ?? []), row]);
  const spread: MatchingRow[] = [];
  for (let depth = 0; spread.length < rows.length; depth++) {
    for (const queue of queues.values()) if (queue[depth] !== undefined) spread.push(queue[depth]!);
  }
  return spread;
}

// ---------------------------------------------------------------------------
// Plain-words variants

export interface VariantMatch {
  readonly term: string;
  readonly param: string;
  readonly value: string | number | boolean;
}

export interface VariantResolution {
  /** Knob overrides, only the ones the words changed. */
  readonly params: Record<string, string | number | boolean>;
  readonly matched: VariantMatch[];
  /** Words that did not land on any knob, option, preset or colour. */
  readonly unmatched: string[];
  /** Preset applied first, when a word named one. */
  readonly preset?: string;
}

const COLOR_WORDS: Readonly<Record<string, string>> = {
  red: '#c0392b', orange: '#e67e22', yellow: '#f1c40f', gold: '#d4a017', green: '#2e8b57',
  lime: '#7cc243', teal: '#1abc9c', cyan: '#3fb8d6', blue: '#2e6fd8', navy: '#1f3a68',
  purple: '#8e44ad', violet: '#9b59b6', pink: '#e86fa3', brown: '#7a4b2a', tan: '#c8a97e',
  beige: '#e3d5b8', white: '#f4f4f0', grey: '#8a8f94', gray: '#8a8f94', silver: '#c0c4c8',
  black: '#262626', cream: '#f3ead3', olive: '#6b7a2f', maroon: '#7b2431',
};

const NUMBER_WORDS: Readonly<Record<string, string>> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10',
  eleven: '11', twelve: '12', single: '1', double: '2', triple: '3',
};

const GROW_WORDS = new Set(['taller', 'bigger', 'larger', 'longer', 'wider', 'more', 'higher']);
const SHRINK_WORDS = new Set(['shorter', 'smaller', 'tinier', 'fewer', 'narrower', 'less', 'lower']);
const ON_WORDS = new Set(['on', 'with', 'yes', 'true']);
const OFF_WORDS = new Set(['off', 'without', 'no', 'false']);

function paramWords(param: CatalogParam): Set<string> {
  const words = tokenize(`${param.name.replace(/([a-z])([A-Z])/g, '$1 $2')} ${param.label ?? ''}`).map(stem);
  return new Set([param.name.toLowerCase(), ...words]);
}

function findParamByWord(
  params: readonly CatalogParam[],
  word: string,
  type?: CatalogParam['type'],
): CatalogParam | undefined {
  const w = stem(word.toLowerCase());
  return params.find((p) => (type === undefined || p.type === type) && paramWords(p).has(w));
}

/** Step a choice or numeric knob up or down from its current value. */
function stepParam(param: CatalogParam, current: string | number | boolean, direction: 1 | -1): string | number | undefined {
  if (param.type === 'choice' && param.choices !== undefined) {
    const at = param.choices.indexOf(String(current));
    const next = param.choices[Math.min(param.choices.length - 1, Math.max(0, at + direction))];
    return next;
  }
  if (param.type === 'number') {
    const value = Number(current);
    const step = param.step ?? Math.max(Math.abs(value) * 0.25, 1);
    const raw = value + direction * step;
    return Math.min(param.max ?? Infinity, Math.max(param.min ?? -Infinity, raw));
  }
  return undefined;
}

/** Size-like knob a bare "taller"/"smaller" applies to. */
function sizeParam(params: readonly CatalogParam[], word: string): CatalogParam | undefined {
  const preferred = word === 'taller' || word === 'shorter' || word === 'higher' || word === 'lower'
    ? ['height', 'tall', 'size', 'scale']
    : word === 'wider' || word === 'narrower' ? ['width', 'wide', 'size', 'scale']
    : word === 'longer' ? ['length', 'long', 'size', 'scale']
    : word === 'more' || word === 'fewer' || word === 'less' ? ['count', 'tier', 'number']
    : ['size', 'scale', 'height', 'width', 'length'];
  for (const key of preferred) {
    const hit = params.find((p) => (p.type === 'choice' || p.type === 'number')
      && [...paramWords(p)].some((w) => w.startsWith(key)));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function choiceFor(param: CatalogParam, word: string): string | undefined {
  return param.choices?.find((choice) => choice.toLowerCase() === word.toLowerCase());
}

interface VariantState {
  readonly asset: CatalogAsset;
  readonly words: readonly string[];
  readonly out: Record<string, string | number | boolean>;
  readonly matched: VariantMatch[];
  preset: string | undefined;
}

/** A rule tries to read the words at `i`; it returns how many it consumed (0 = no). */
type VariantRule = (state: VariantState, i: number) => number;

function setKnob(state: VariantState, term: string, param: CatalogParam, value: string | number | boolean): void {
  state.out[param.name] = value;
  state.matched.push({ term, param: param.name, value });
}

function currentValue(state: VariantState, param: CatalogParam): string | number | boolean {
  const fromPreset = state.preset === undefined ? undefined : state.asset.presets[state.preset]?.[param.name];
  return state.out[param.name] ?? fromPreset ?? param.default;
}

const presetRule: VariantRule = (state, i) => {
  const word = state.words[i]!;
  if (state.preset !== undefined || !Object.hasOwn(state.asset.presets, word)) return 0;
  state.preset = word;
  return 1;
};

/** `<knob> <value>`, or a boolean knob named on its own (= on). */
const namedKnobRule: VariantRule = (state, i) => {
  const [word, next] = [state.words[i]!, state.words[i + 1]];
  const named = findParamByWord(state.asset.params, word);
  if (named === undefined) return 0;
  const value = next === undefined ? undefined : valueForParam(named, next);
  if (value !== undefined) { setKnob(state, `${word} ${next}`, named, value); return 2; }
  if (named.type === 'boolean') { setKnob(state, word, named, true); return 1; }
  return 0;
};

/** `with|without|on|off <boolean knob>`. */
const toggleRule: VariantRule = (state, i) => {
  const [word, next] = [state.words[i]!, state.words[i + 1]];
  if (next === undefined || !(ON_WORDS.has(word) || OFF_WORDS.has(word))) return 0;
  const target = findParamByWord(state.asset.params, next, 'boolean');
  if (target === undefined) return 0;
  setKnob(state, `${word} ${next}`, target, ON_WORDS.has(word));
  return 2;
};

/** `#hex` or a colour word, before a colour knob's name or alone (first colour knob). */
const colorRule: VariantRule = (state, i) => {
  const [word, next] = [state.words[i]!, state.words[i + 1]];
  const hex = /^#[0-9a-f]{6}$/.test(word) ? word : COLOR_WORDS[word];
  if (hex === undefined) return 0;
  const named = next === undefined ? undefined : findParamByWord(state.asset.params, next, 'color');
  const target = named ?? state.asset.params.find((p) => p.type === 'color');
  if (target === undefined) return 0;
  setKnob(state, named === undefined ? word : `${word} ${next}`, target, hex);
  return named === undefined ? 1 : 2;
};

/** `<value> <knob>`: "5 tiers", "8 height", "red bark" is handled by colorRule. */
const valueBeforeKnobRule: VariantRule = (state, i) => {
  const [word, next] = [state.words[i]!, state.words[i + 1]];
  if (next === undefined) return 0;
  const named = findParamByWord(state.asset.params, next);
  const value = named === undefined ? undefined : valueForParam(named, word);
  if (named === undefined || value === undefined || named.type === 'boolean') return 0;
  setKnob(state, `${word} ${next}`, named, value);
  return 2;
};

/** A bare option value of some choice knob. */
const choiceRule: VariantRule = (state, i) => {
  const word = state.words[i]!;
  const owner = state.asset.params.find((p) => p.type === 'choice' && choiceFor(p, word) !== undefined);
  if (owner === undefined) return 0;
  setKnob(state, word, owner, choiceFor(owner, word)!);
  return 1;
};

/** `taller`, `more tiers`, `smaller`: step a named knob or the size/count knob. */
const comparativeRule: VariantRule = (state, i) => {
  const [word, next] = [state.words[i]!, state.words[i + 1]];
  const direction = GROW_WORDS.has(word) ? 1 : SHRINK_WORDS.has(word) ? -1 : 0;
  if (direction === 0) return 0;
  const named = next === undefined ? undefined : findParamByWord(state.asset.params, next);
  const target = named ?? sizeParam(state.asset.params, word);
  const stepped = target === undefined ? undefined : stepParam(target, currentValue(state, target), direction);
  if (target === undefined || stepped === undefined) return 0;
  setKnob(state, named === undefined ? word : `${word} ${next}`, target, stepped);
  return named === undefined ? 1 : 2;
};

const VARIANT_RULES: readonly VariantRule[] = [
  presetRule, namedKnobRule, toggleRule, colorRule, valueBeforeKnobRule, choiceRule, comparativeRule,
];

/**
 * Turn plain words into knob overrides for one asset: preset names, choice
 * option values, `<knob> <value>` and `<value> <knob>` pairs (number words
 * such as "five" count), `#hex` or a basic colour word before
 * a colour knob (or alone: the first colour knob), on/off/with/without before
 * a boolean knob, and taller/shorter/more/fewer stepping a size or count knob.
 * Unknown words are returned, not guessed.
 */
export function resolveVariant(asset: CatalogAsset, want: string): VariantResolution {
  const words = want.toLowerCase().split(/[\s,;]+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w))
    .map((w) => NUMBER_WORDS[w] ?? w);
  const state: VariantState = { asset, words, out: {}, matched: [], preset: undefined };
  const unmatched: string[] = [];
  for (let i = 0; i < words.length;) {
    const consumed = VARIANT_RULES.reduce((taken, rule) => taken || rule(state, i), 0);
    if (consumed === 0 && findParamByWord(asset.params, words[i]!) === undefined) unmatched.push(words[i]!);
    i += Math.max(1, consumed);
  }
  return {
    params: state.out,
    matched: state.matched,
    unmatched,
    ...(state.preset === undefined ? {} : { preset: state.preset }),
  };
}

function valueForParam(param: CatalogParam, word: string): string | number | boolean | undefined {
  switch (param.type) {
    case 'choice': {
      const exact = choiceFor(param, word);
      if (exact !== undefined) return exact;
      const n = Number(word);
      if (!Number.isFinite(n) || param.choices === undefined) return undefined;
      const numeric = param.choices.map(Number);
      if (numeric.some((c) => !Number.isFinite(c))) return undefined;
      let best = 0;
      numeric.forEach((c, k) => { if (Math.abs(c - n) < Math.abs(numeric[best]! - n)) best = k; });
      return param.choices[best];
    }
    case 'number': {
      const n = Number(word);
      if (!Number.isFinite(n)) return undefined;
      return Math.min(param.max ?? Infinity, Math.max(param.min ?? -Infinity, n));
    }
    case 'boolean':
      if (ON_WORDS.has(word)) return true;
      if (OFF_WORDS.has(word)) return false;
      return undefined;
    case 'color':
      if (/^#[0-9a-f]{6}$/.test(word)) return word;
      return COLOR_WORDS[word];
    default:
      return undefined;
  }
}
