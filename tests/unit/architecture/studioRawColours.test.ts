// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Ratchet: Studio colours come from the semantic tokens in src/index.css
// (bg-surface-1, text-fg-2, border-border, ...). Files that still carry raw
// hex or raw gray utilities are listed in studioRawColourBaseline.json with
// their count. A file may not gain raw colours, and a new file starts at zero.
// Numeric three.js colours (0x...) are not counted. To record a file you moved
// to the tokens, run: KC_UPDATE_RAW_COLOUR_BASELINE=1 npx vitest run <this file>
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../..');
const STUDIO_ROOT = join(ROOT, 'src/studio');
const BASELINE_PATH = join(__dirname, 'studioRawColourBaseline.json');

/** `bg-[#222]`, `hover:text-gray-400`, `border-zinc-700/50`, ... */
const RAW_COLOUR_CLASS =
  /(?<=^|[\s'"`:])(?:bg|text|border(?:-[trblxy])?|divide|ring|ring-offset|outline|placeholder|from|via|to|fill|stroke|accent|caret|decoration|shadow)-(?:\[#[0-9a-fA-F]{3,8}\]|(?:gray|zinc|slate|neutral|stone)-\d{2,3})/g;
/** A quoted hex colour: inline styles, SVG attributes, string scene colours. */
const QUOTED_HEX = /(['"`])#[0-9a-fA-F]{3,8}\1/g;

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(entry) && !/\.(test|spec)\.tsx?$/.test(entry)) acc.push(full);
  }
  return acc;
}

function countRawColours(source: string): number {
  return (source.match(RAW_COLOUR_CLASS)?.length ?? 0) + (source.match(QUOTED_HEX)?.length ?? 0);
}

function currentCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of walk(STUDIO_ROOT).sort()) {
    const n = countRawColours(readFileSync(file, 'utf8'));
    if (n > 0) counts[relative(ROOT, file)] = n;
  }
  return counts;
}

describe('studio raw colour ratchet', () => {
  it('counts raw colour classes and quoted hex, not tokens or numeric colours', () => {
    expect(countRawColours(`className="bg-[#222] hover:text-gray-400 border-zinc-700/50"`)).toBe(3);
    expect(countRawColours(`style={{ background: '#111' }}`)).toBe(1);
    expect(countRawColours(`className="bg-surface-1 text-fg-2 border-border text-2xs"`)).toBe(0);
    expect(countRawColours(`new THREE.Color(0x222222); // see #709`)).toBe(0);
  });

  it('no Studio file gains raw colours', () => {
    const counts = currentCounts();
    if (process.env.KC_UPDATE_RAW_COLOUR_BASELINE === '1') {
      writeFileSync(BASELINE_PATH, `${JSON.stringify(counts, null, 2)}\n`);
    }
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<string, number>;
    const grown = Object.entries(counts)
      .filter(([file, n]) => n > (baseline[file] ?? 0))
      .map(([file, n]) => `${file}: ${baseline[file] ?? 0} -> ${n}`);
    expect(
      grown,
      `Use the semantic colour tokens from src/index.css (bg-surface-1, text-fg-2, border-border, ...) instead of raw hex or gray utilities:\n${grown.join('\n')}`,
    ).toEqual([]);
  });
});
