// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const version: string = JSON.parse(readFileSync(`${ROOT}package.json`, 'utf8')).version;
const installer = readFileSync(`${ROOT}scripts/install.sh`, 'utf8');

describe('CLI installer version hints', () => {
  it('keeps pinned examples and error guidance aligned with the package release', () => {
    const pins = [...installer.matchAll(/KERNELCAD_VERSION=(v[0-9]+\.[0-9]+\.[0-9]+)/g)].map((match) => match[1]);
    expect(pins.length).toBeGreaterThan(0);
    expect(new Set(pins)).toEqual(new Set([`v${version}`]));
  });
});
