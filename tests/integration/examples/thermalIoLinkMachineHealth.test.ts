import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = resolve('examples/community/thermal-iolink-machine-health.kcad.ts');

describe('Thermal IO-Link machine-health reference assembly', () => {
  it('uses named catalog components and physical interfaces instead of fallback electronics', () => {
    expect(existsSync(sourcePath)).toBe(true);

    const source = readFileSync(sourcePath, 'utf8');

    for (const id of [
      'esp32-c3-supermini-board',
      'mlx90640',
      'max14827',
      'm12-iolink-5pin',
    ]) {
      expect(source).toContain(`await lib.fetchPart('${id}')`);
    }

    for (const partName of [
      'industrial-sensor-enclosure',
      'm12-panel-clamp',
      'electronics-carrier',
      'carrier-support-rails',
      'thermal-aperture-bezel',
      'esp32-c3-supermini-controller',
      'mlx90640-thermal-camera',
      'max14827-iolink-phy',
      'm12-iolink-5pin-connector',
    ]) {
      expect(source).toContain(`thermal.part('${partName}'`);
    }

    expect(source).toContain("thermal.mate('carrier-supports-retained-in-enclosure'");
    expect(source).toContain("thermal.mate('carrier-retained-on-supports'");
    expect(source).toContain('carrierSupportCrossbar');
    expect(source).toContain("thermal.mate('mlx90640-on-carrier'");
    expect(source).toContain("thermal.mate('max14827-on-carrier'");
    expect(source).toContain("thermal.mate('esp32-on-carrier'");
    expect(source).toContain("thermal.mate('m12-clamp-retained-in-enclosure'");
    expect(source).toContain("thermal.mate('m12-retained-by-panel-clamp'");
    expect(source).toContain('return thermal.solvedModel({});');

    expect(source).not.toMatch(/part\(\s*null/);
    expect(source).not.toMatch(/fallback\s*(?:box|electronics|component)/i);
  });
});
