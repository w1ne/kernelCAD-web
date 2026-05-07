import { describe, expect, it } from 'vitest';
import { CaptureSession } from '../../../src/capture/captureSession';
import { createApi } from '../../../src/modules/api';

describe('robotArmKit intent workflow', () => {
  it('generates named parts, manifest, validations, and assembly joint intent', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const kit = kcad.robotArmKit({
      name: 'desktop arm',
      linkLengths: [72, 58, 34],
      plateThickness: 4,
      linkWidth: 18,
      pivotDiameter: 5,
      screwPattern: { x: 24, y: 12, diameter: 3 },
      jointLimitsDeg: {
        base: [-120, 120],
        shoulder: [-45, 135],
        elbow: [-120, 120],
        wrist: [-90, 90],
      },
    });

    expect(kit.validations()).toEqual([
      expect.objectContaining({ code: 'robot-arm.ok', severity: 'info' }),
    ]);

    const parts = kit.parts();
    expect(parts.map(part => part.name)).toEqual([
      'base-plate',
      'shoulder-link',
      'elbow-link',
      'wrist-link',
      'tool-placeholder',
    ]);
    expect(parts.every(part => part.exportFile.endsWith('.stl'))).toBe(true);

    const model = kit.model();
    expect(model.id).toMatch(/^assemblyModel_/);

    expect(kit.manifest()).toMatchObject({
      name: 'desktop arm',
      kind: 'robot-arm-kit',
      generatedSource: 'robotArmKit(intent).model()',
      parts: [
        { name: 'base-plate', quantity: 1, exportFile: 'base-plate.stl' },
        { name: 'shoulder-link', quantity: 1, exportFile: 'shoulder-link.stl' },
        { name: 'elbow-link', quantity: 1, exportFile: 'elbow-link.stl' },
        { name: 'wrist-link', quantity: 1, exportFile: 'wrist-link.stl' },
        { name: 'tool-placeholder', quantity: 1, exportFile: 'tool-placeholder.stl' },
      ],
      joints: [
        { name: 'base-yaw', type: 'revolute', limitsDeg: [-120, 120] },
        { name: 'shoulder-pitch', type: 'revolute', limitsDeg: [-45, 135] },
        { name: 'elbow-pitch', type: 'revolute', limitsDeg: [-120, 120] },
        { name: 'wrist-pitch', type: 'revolute', limitsDeg: [-90, 90] },
      ],
      hardware: expect.objectContaining({
        screwPattern: { x: 24, y: 12, diameter: 3 },
        pivotDiameter: 5,
      }),
    });

    const records = session.getRecords();
    expect(records.filter(record => record.kind === 'assemblyPart')).toHaveLength(5);
    expect(records.filter(record => record.kind === 'assemblyJoint')).toHaveLength(4);
    expect(records.filter(record => record.kind === 'assemblyModel')).toHaveLength(1);
    expect(records.find(record => record.kind === 'assemblyJoint')).toMatchObject({
      metadata: {
        assemblyName: 'desktop arm',
        jointName: 'base-yaw',
        jointKind: 'revolute',
      },
    });
  });

  it('packages a manifest and deterministic per-part source files for export', async () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    const kit = kcad.robotArmKit({
      name: 'desktop arm',
      linkLengths: [72, 58, 34],
      plateThickness: 4,
      linkWidth: 18,
      pivotDiameter: 5,
      screwPattern: { x: 24, y: 12, diameter: 3 },
    });

    const pkg = kit.exportPackage();

    expect(pkg.manifestFile).toBe('manifest.json');
    expect(pkg.files.map(file => file.path)).toEqual([
      'manifest.json',
      'parts/base-plate.kcad.ts',
      'parts/shoulder-link.kcad.ts',
      'parts/elbow-link.kcad.ts',
      'parts/wrist-link.kcad.ts',
      'parts/tool-placeholder.kcad.ts',
    ]);
    const manifest = JSON.parse(pkg.files[0].contents);
    expect(manifest).toMatchObject({
      kind: 'robot-arm-kit',
      name: 'desktop arm',
    });
    expect(manifest.parts[0]).toMatchObject({
      name: 'base-plate',
      sourceFile: 'parts/base-plate.kcad.ts',
      exportFile: 'parts/base-plate.stl',
    });
    expect(pkg.files[1].contents).toContain("return kit.part('base-plate');");
  });

  it('rejects invalid mechanical intent before creating geometry', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });

    expect(() => kcad.robotArmKit({
      linkLengths: [18, 58, 34],
      plateThickness: 4,
      linkWidth: 10,
      pivotDiameter: 8,
      clearance: 2,
      screwPattern: { x: 80, y: 12, diameter: 3 },
    })).toThrow(/robotArmKit intent is not mechanically valid/);

    expect(session.getRecords()).toEqual([]);
  });
});
