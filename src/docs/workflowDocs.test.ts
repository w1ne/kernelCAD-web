// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../agent/mcp/toolRegistry';
import { buildMcpReference, buildDesignGuide, searchGuide } from './workflowDocs';
import { loadSnippets } from '../agent/cookbook/loader';
import { readFileSync } from 'node:fs';

const catalogRoot = 'src/agent/skills/kernelcad-shopcheck/catalogs/';
const json = (file: string) => JSON.parse(readFileSync(catalogRoot + file, 'utf8'));
const guide = buildDesignGuide(loadSnippets(), json('vendors/sendcutsend/rules.json'), json('vendors/sendcutsend/catalog.json'), json('sources-manifest.json'));

describe('workflow docs data', () => {
  it('preserves canonical local tool names, complete schemas, and annotations', () => {
    const reference = buildMcpReference(TOOLS);
    expect(reference.scope).toBe('local');
    expect(reference.tools).toEqual(TOOLS);
    expect(JSON.parse(JSON.stringify(reference)).tools).toEqual(TOOLS);
    expect(reference.tools.find(tool => tool.name === 'verify')?.inputSchema.allOf).toEqual(TOOLS.find(tool => tool.name === 'verify')?.inputSchema.allOf);
  });

  it('finds useful bracket and enclosure recipes without inventing guidance', () => {
    expect(searchGuide(guide, 'bracket').some(entry => entry.kind === 'recipe')).toBe(true);
    expect(searchGuide(guide, 'enclosure').some(entry => entry.kind === 'recipe')).toBe(true);
    for (const entry of guide.filter(item => item.kind === 'recipe')) {
      expect(entry.sourceUrl).toMatch(/^https:\/\/github.com\/w1ne\/kernelCAD-web\/blob\/develop\/cookbook\/snippets\//);
      expect(entry.content).toBeTruthy();
    }
  });

  it('bounds results, returns no irrelevant hits and rejects invalid limits', () => {
    expect(searchGuide(guide, '', 3)).toHaveLength(3);
    expect(searchGuide(guide, '', 10000)).toHaveLength(50);
    expect(searchGuide(guide, 'zzzz_unmatched_design')).toEqual([]);
    expect(searchGuide(guide, '', 0)).toEqual([]);
    expect(searchGuide(guide, '', Number.NaN)).toEqual([]);
  });

  it('retains dated vendor provenance for rules and material rows', () => {
    const vendor = guide.filter(entry => entry.kind !== 'recipe');
    expect(vendor.length).toBe(25);
    for (const entry of vendor) {
      expect(entry.snapshotDate).toBe('2026-05-23');
      expect(entry.sourceUrls?.every(url => url.startsWith('https://sendcutsend.com/'))).toBe(true);
      expect(entry.content).toBeTruthy();
    }
    expect(guide.find(entry => entry.id === 'material:aluminum-6061-t6')?.content).toContain('0.063');
  });
});
