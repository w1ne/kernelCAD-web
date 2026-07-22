// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type CatalogPart = {
  id: string;
  name: string;
  family: string;
  kcad_source?: string;
  license?: string;
  attribution?: string;
};

const repoRoot = resolve(__dirname, '..');
const manifestPath = resolve(repoRoot, 'scripts/electronics-parts.json');
const authoredDirectory = resolve(repoRoot, 'scripts/parts/authored');
const a4988Path = resolve(authoredDirectory, 'a4988-stepstick-carrier.kcad.ts');
const sg90Path = resolve(authoredDirectory, 'sg90-micro-servo.kcad.ts');
const a4988ContactNames = [
  'en-contact', 'ms1-contact', 'ms2-contact', 'ms3-contact',
  'reset-contact', 'sleep-contact', 'step-contact', 'dir-contact',
  'vmot-contact', 'gnd-motor-contact', 'motor-2b-contact',
  'motor-2a-contact', 'motor-1a-contact', 'motor-1b-contact',
  'gnd-logic-contact', 'vdd-contact',
] as const;
const forbiddenInterfaceNames = ['mount-hole', 'universal-spline', 'x-motor', 'y-motor'];

function source(path: string): string {
  expect(existsSync(path), `missing authored source ${path}`).toBe(true);
  return readFileSync(path, 'utf8');
}

function catalogPart(id: string): CatalogPart {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { parts: CatalogPart[] };
  const part = manifest.parts.find((candidate) => candidate.id === id);
  expect(part, `missing catalog part ${id}`).toBeDefined();
  return part!;
}

describe('universal authored electronics', () => {
  it('models the A4988 StepStick carrier with real plated-hole interfaces', () => {
    const a4988 = source(a4988Path);

    expect(a4988).toContain('https://www.pololu.com/product/2128');
    expect(a4988).toContain('https://www.pololu.com/file/0J1081/a4988-stepper-motor-driver-carrier-black-edition-dimension-diagram.pdf');
    expect(a4988).toContain('https://www.pololu.com/file/0J1225/a4988-stepper-motor-driver-carrier-black-edition.step');
    expect(a4988).toContain('const pcbRef = asm.part');
    expect(a4988).toMatch(/pcbRef\.connector\(\s*'carrier-solder-face'/);
    expect(a4988).toContain('const padRef = asm.part');
    expect(a4988).toMatch(/padRef\.connector\(\s*pin\.connector/);
    expect(a4988).toContain('platedHoles');
    expect(a4988).toContain('through-hole centerline convention');
    expect(a4988).toContain('const QFN_X = 3.342;');
    expect(a4988).toContain('const QFN_Y = 8.803;');
    expect(a4988).toContain('const TRIMMER_X = 8.727;');
    expect(a4988).toContain('const TRIMMER_Y = 2.7905;');
    expect(a4988).toContain('const TRIMMER_RADIUS = 1.5;');
    expect(a4988).not.toContain('currentLimitAdjuster');
    for (const contact of a4988ContactNames) expect(a4988).toContain(`'${contact}'`);
    for (const forbidden of forbiddenInterfaceNames) expect(a4988).not.toContain(forbidden);
  });

  it('models the SG90 datasheet envelope and canonical plug-contact proxies', () => {
    const sg90 = source(sg90Path);

    expect(sg90).toContain('https://www.kjell.com/globalassets/mediaassets/701916_87897_datasheet_en.pdf');
    expect(sg90).toContain('const ENVELOPE_X = 32.0;');
    expect(sg90).toContain('const ENVELOPE_Y = 12.4;');
    expect(sg90).toContain('const ENVELOPE_Z = 26.7;');
    expect(sg90).toContain('const CABLE_LENGTH = 250.0;');
    expect(sg90).toContain('canonical straightened harness pose');
    expect(sg90).toContain('const leadRef = asm.part');
    for (const contact of ['ground', 'vplus', 'pwm']) {
      expect(sg90).toContain(`name: '${contact}'`);
    }
    expect(sg90).toMatch(/leadRef\.connector\(\s*`\$\{lead\.name\}-contact`/);
    expect(sg90).toContain('value: [CABLE_CONTACT_X, lead.y, CABLE_Z]');
    expect(sg90).toContain('plug-contact proxy');
    expect(sg90).toContain('canonical catalog pose');
    expect(sg90).not.toContain('nominal bare 28-AWG');
    expect(sg90).not.toContain('output-axis-envelope');
    expect(sg90).not.toMatch(/type:\s*'axis'/);
    expect(sg90).not.toContain('OUTPUT_X');
    expect(sg90).not.toContain('cableStrainRelief');
    for (const forbidden of forbiddenInterfaceNames) expect(sg90).not.toContain(forbidden);
  });

  it('registers both components as standalone catalog parts with source attribution', () => {
    const a4988 = catalogPart('a4988-stepstick-carrier');
    const sg90 = catalogPart('sg90-micro-servo');

    expect(a4988).toMatchObject({
      name: 'A4988 StepStick carrier (Pololu #2128 Black Edition)',
      family: 'stepper-driver',
      kcad_source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
      license: 'MIT',
    });
    expect(a4988.attribution).toContain('pololu.com/product/2128');
    expect(sg90).toMatchObject({
      name: 'SG90 micro servo (Luxor Parts 87897)',
      family: 'micro-servo',
      kcad_source: 'scripts/parts/authored/sg90-micro-servo.kcad.ts',
      license: 'MIT',
    });
    expect(sg90.attribution).toContain('701916_87897_datasheet_en.pdf');
  });
});
