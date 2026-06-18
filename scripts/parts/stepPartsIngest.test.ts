// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/parts/stepPartsIngest.test.ts

import { describe, it, expect } from 'vitest';
import {
  ingestStepParts,
  classifyLicense,
  parseThirdPartyNotices,
} from './stepPartsIngest';

const BASE = 'https://api.step.parts';

// Fixture catalog: one part per source/license shape. `license` is inlined on
// the item so the resolver has a deterministic per-part value to classify
// (the real index has no license field; this exercises the classify+map path).
const FIXTURE_INDEX = {
  catalog: { version: 'test-v1', sha256: 'deadbeef' },
  fields: ['id', 'name', 'category', 'family'],
  items: [
    {
      id: 'din913_set_screw_m3x3',
      name: 'DIN 913 set screw, M3 x 3',
      category: 'fastener',
      family: 'set-screw',
      standard: 'DIN 913',
      tags: ['screw', 'metric'],
      aliases: ['M3 set screw'],
      pageUrl: 'https://www.step.parts/parts/din913_set_screw_m3x3',
      stepUrl: 'https://media.example/din913.step',
      sha256: 'aaa',
      license: 'MIT',
    },
    {
      id: 'nema17_stepper',
      name: 'NEMA 17 stepper motor',
      category: 'unknown-source-category', // not a taxonomy cat -> guessCategory
      family: 'stepper',
      tags: ['motor', 'nema'],
      pageUrl: 'https://www.step.parts/parts/nema17_stepper',
      stepUrl: 'https://media.example/nema17.step',
      license: 'BSD-3-Clause',
    },
    {
      id: 'kicad_R_0805',
      name: 'Resistor 0805 (KiCad)',
      category: 'electronics-module',
      family: 'resistor',
      tags: ['kicad', 'smd'],
      pageUrl: 'https://www.step.parts/parts/kicad_R_0805',
      stepUrl: 'https://media.example/r0805.step',
      license: 'CC-BY-SA-4.0',
    },
    {
      id: 'nc_only_widget',
      name: 'NonCommercial widget',
      category: 'uncategorized',
      family: 'widget',
      tags: [],
      pageUrl: 'https://www.step.parts/parts/nc_only_widget',
      stepUrl: 'https://media.example/nc.step',
      license: 'CC-BY-NC-4.0',
    },
    {
      id: 'nd_only_widget',
      name: 'NoDerivatives widget',
      category: 'uncategorized',
      family: 'widget',
      tags: [],
      pageUrl: 'https://www.step.parts/parts/nd_only_widget',
      stepUrl: 'https://media.example/nd.step',
      license: 'CC-BY-ND-4.0',
    },
    {
      id: 'mystery_part',
      name: 'Mystery part with no license',
      category: 'uncategorized',
      family: 'mystery',
      tags: [],
      pageUrl: 'https://www.step.parts/parts/mystery_part',
      stepUrl: 'https://media.example/mystery.step',
      // no license field, no notices entry -> unknown -> fetch-only -> dropped
    },
  ],
};

const FIXTURE_NOTICES = `# Third Party Notices

This project's original material is licensed under the MIT License.

## License summary

### KiCad kicad-packages3D
https://gitlab.com/kicad/libraries/kicad-packages3D
SPDX: CC-BY-SA-4.0 WITH KiCad-libraries-exception

### Per-part overrides
| nema17_stepper | BSD-3-Clause |
`;

function makeFetch() {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input);
    if (url.endsWith('/v1/catalog/parts.index.json')) {
      return new Response(JSON.stringify(FIXTURE_INDEX), { status: 200 });
    }
    if (url.includes('THIRD_PARTY_NOTICES.md')) {
      return new Response(FIXTURE_NOTICES, { status: 200 });
    }
    return new Response('not found', { status: 404 });
  };
}

describe('classifyLicense', () => {
  it('maps permissive licenses', () => {
    for (const l of ['MIT', 'BSD-3-Clause', 'Apache-2.0', 'CC0-1.0', 'CC-BY-3.0', 'ISC', 'Unlicense']) {
      expect(classifyLicense(l), l).toBe('permissive');
    }
  });
  it('maps share-alike / copyleft licenses', () => {
    for (const l of ['CC-BY-SA-4.0', 'GPL-3.0', 'LGPL-2.1', 'MPL-2.0', 'CERN-OHL-S-2.0']) {
      expect(classifyLicense(l), l).toBe('share-alike');
    }
  });
  it('maps NC / ND / unknown / empty to fetch-only', () => {
    for (const l of ['CC-BY-NC-4.0', 'CC-BY-ND-4.0', 'CC-BY-NC-SA-4.0', 'unknown', '', undefined, null]) {
      expect(classifyLicense(l as string | undefined), String(l)).toBe('fetch-only');
    }
  });
});

describe('parseThirdPartyNotices', () => {
  it('records a default MIT and a per-source SA entry', () => {
    const t = parseThirdPartyNotices(FIXTURE_NOTICES);
    expect(t.defaultSpdx?.toUpperCase()).toContain('MIT');
    const kicad = t.bySource.get('kicad-kicad-packages3d');
    expect(kicad).toBeTruthy();
    expect(classifyLicense(kicad)).toBe('share-alike');
  });
});

describe('ingestStepParts', () => {
  it('drops NC/ND/unknown and keeps permissive + share-alike', async () => {
    const { candidates, report } = await ingestStepParts({
      baseUrl: BASE,
      fetchImpl: makeFetch(),
    });

    const keptIds = candidates.map((c) => c.id);

    // 3 redistributable, 3 dropped (NC, ND, unknown).
    expect(report.ingested).toBe(3);
    expect(report.droppedForLicense).toBe(3);
    expect(candidates).toHaveLength(3);

    expect(keptIds).toContain('din913_set_screw_m3x3');
    expect(keptIds).toContain('nema17_stepper');
    expect(keptIds).toContain('kicad_R_0805');

    expect(keptIds).not.toContain('nc_only_widget');
    expect(keptIds).not.toContain('nd_only_widget');
    expect(keptIds).not.toContain('mystery_part');
  });

  it('stamps permissive parts with class, mirror, stepUrl, upstream', async () => {
    const { candidates } = await ingestStepParts({ baseUrl: BASE, fetchImpl: makeFetch() });
    const mit = candidates.find((c) => c.id === 'din913_set_screw_m3x3')!;
    expect(mit.licenseClass).toBe('permissive');
    expect(mit.redistribution).toBe('mirror');
    expect(mit.stepUrl).toBe('https://media.example/din913.step');
    expect(mit.upstream).toMatchObject({
      repo: 'github.com/earthtojake/step.parts',
      commit: 'test-v1',
      path: 'din913_set_screw_m3x3',
    });
    expect(mit.attribution).toBeTruthy();
    expect(mit.standard).toBe('DIN 913');
    expect(mit.category).toBe('fastener');
  });

  it('classifies share-alike parts as share-alike', async () => {
    const { candidates } = await ingestStepParts({ baseUrl: BASE, fetchImpl: makeFetch() });
    const sa = candidates.find((c) => c.id === 'kicad_R_0805')!;
    expect(sa.licenseClass).toBe('share-alike');
    expect(sa.redistribution).toBe('mirror');
  });

  it('maps non-taxonomy source categories via guessCategory', async () => {
    const { candidates } = await ingestStepParts({ baseUrl: BASE, fetchImpl: makeFetch() });
    const motor = candidates.find((c) => c.id === 'nema17_stepper')!;
    // 'unknown-source-category' is not a taxonomy cat -> guessed from name/tags.
    expect(motor.category).toBe('actuator');
  });

  it('report counts add up to the index size', async () => {
    const { report } = await ingestStepParts({ baseUrl: BASE, fetchImpl: makeFetch() });
    const accounted =
      report.ingested +
      report.droppedForLicense +
      report.skippedUnparseable +
      report.deduped;
    expect(accounted).toBe(FIXTURE_INDEX.items.length);
  });

  it('respects the limit option', async () => {
    const { candidates } = await ingestStepParts({
      baseUrl: BASE,
      fetchImpl: makeFetch(),
      limit: 1,
    });
    expect(candidates).toHaveLength(1);
  });
});
