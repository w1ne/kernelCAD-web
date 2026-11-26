// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import type { PartRecord } from '../../../shared/parts/types';
import { elementRecord, type ElementFamilySpec } from './types';
import { elementFamilySpecs, isElementFamily, listElementCatalogSeedEntries, resolveElement } from './registry';

export interface ElementSearchOpts {
  category?: string;
  family?: string;
  standard?: string;
  tag?: string;
  limit?: number;
}

export function isElementLibraryQuery(query: string, opts: ElementSearchOpts = {}): boolean {
  if (isElementFamily(opts.family ?? '')) return true;
  return findFamily(query) !== undefined;
}

export function searchElementLibrary(query: string, opts: ElementSearchOpts = {}): PartRecord[] {
  if (opts.category !== undefined && opts.category !== 'mechanical') return [];
  const family = isElementFamily(opts.family ?? '') ? opts.family : findFamily(query);
  if (family === undefined) return [];
  const spec = elementFamilySpecs().find((candidate) => candidate.family === family);
  if (spec === undefined) return [];
  const requestedSize = sizeForQuery(spec, query);
  const lengthMm = lengthForQuery(family, query, requestedSize);
  const candidates = requestedSize === undefined
    ? listElementCatalogSeedEntries().filter((entry) => entry.family === family)
    : [{ family, size: requestedSize, ...(lengthMm === undefined ? {} : { lengthMm }) }];
  const tag = opts.tag?.toLowerCase();
  return candidates
    .map((request) => elementRecord(resolveElement(request)))
    .filter((record) => opts.family === undefined || record.family === opts.family)
    .filter((record) => opts.standard === undefined || record.standard === opts.standard)
    .filter((record) => tag === undefined || record.tags.some((item) => item.toLowerCase() === tag))
    .slice(0, opts.limit ?? 5000);
}

const FAMILY_RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/mgn\d+[ch]|hgh\d+ca|hgw\d+cc/, 'linear-carriage'],
  [/(mgn|hgr)\d+/, 'linear-rail'],
  [/lm\d+uu/, 'linear-bearing'],
  [/^(sk|shf)\d+/, 'shaft-support'],
  [/t8flange|antibacklash|leadscrewnut/, 'leadscrew-nut'],
  [/tr8x[248]|leadscrew/, 'leadscrew'],
  [/shaftcollar|collar/, 'shaft-collar'],
  [/jaw|beam|coupler/, 'shaft-coupler'],
  [/gt2|timingpulley/, 'timing-pulley'],
  [/tnut|extrusiontnut/, 'extrusion-t-nut'],
  [/bracket|lplate|tplate/, 'extrusion-bracket'],
  [/extrusion|^(vslot)?(2020|2040|2060|3030|4040|4080)/, 'aluminum-extrusion'],
];

function findFamily(query: string): string | undefined {
  const text = normalize(query);
  if (text.length === 0) return undefined;
  const named = elementFamilySpecs().find((c) => text.includes(normalize(c.family)));
  if (named !== undefined) return named.family;
  const rule = FAMILY_RULES.find(([pattern]) => pattern.test(text));
  if (rule !== undefined) return rule[1];
  const bySize = elementFamilySpecs().find((c) =>
    Object.keys(c.sizes).some((size) => text.includes(normalize(size))));
  return bySize?.family;
}

function sizeForQuery(spec: ElementFamilySpec, query: string): string | undefined {
  const text = normalize(query);
  const sizes = Object.keys(spec.sizes);
  const exact = sizes.find((size) => text.includes(normalize(size)));
  if (exact !== undefined) return exact;
  if (spec.family === 'shaft-coupler') {
    const kind = text.includes('beam') ? 'beam-' : text.includes('jaw') ? 'jaw-' : '';
    const bore = query.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
    if (kind && bore) return `${kind}${bore[1]}x${bore[2]}`;
  }
  if (spec.family === 'timing-pulley' && text.includes('gt220t')) return 'GT2-20T-5';
  if (spec.family === 'shaft-collar') {
    const diameter = query.match(/\b(5|6|8|10|12|16|20)\s*mm\b/i)?.[1]
      ?? query.match(/collar\s+(5|6|8|10|12|16|20)\b/i)?.[1];
    if (diameter !== undefined) return diameter;
  }
  return undefined;
}

function lengthForQuery(family: string, query: string, size: string | undefined): number | undefined {
  if (!['linear-rail', 'aluminum-extrusion', 'leadscrew'].includes(family) || size === undefined) return undefined;
  const normalized = normalize(query).replace(normalize(size), '');
  const values = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (family === 'linear-rail' && query.match(/\b(?:MGN|HGR)\s*\d+\s+(\d+(?:\.\d+)?)/i)) {
    return Number(query.match(/\b(?:MGN|HGR)\s*\d+\s+(\d+(?:\.\d+)?)/i)?.[1]);
  }
  if (family === 'aluminum-extrusion') {
    const match = query.match(/(?:2020|2040|2060|3030|4040|4080|v-slot-2020|v-slot-2040)\s+(?:extrusion\s+)?(\d+(?:\.\d+)?)/i);
    if (match?.[1] !== undefined) return Number(match[1]);
  }
  if (family === 'leadscrew') {
    const match = query.match(/Tr8x[248]\s+(\d+(?:\.\d+)?)/i);
    if (match?.[1] !== undefined) return Number(match[1]);
  }
  return values.length === 1 ? values[0] : undefined;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]/g, '');
}
