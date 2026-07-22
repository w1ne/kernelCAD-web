// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { ConnectorEntry } from '../../shared/parts/connectorManifestSchema';
import { createApi } from '../api';
import { CaptureSession } from './captureSession';

const authoredConnectors = (): ConnectorEntry[] => [
  {
    name: 'mount',
    type: 'frame',
    origin: [1, 2, 3],
    normal: [0, 0, 1],
  },
  {
    name: 'shaft',
    type: 'axis',
    origin: [4, 5, 6],
    axis: [0, 1, 0],
  },
];

describe('Assembly catalog connector promotion', () => {
  it('promotes authored frame and axis entries to both connector APIs and mates', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const catalogShape = kcad.box(10, 10, 10);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    const catalog = arm.part('catalog', catalogShape);
    const mount = catalog.connector('mount');
    const shaft = catalog.connector('shaft');

    expect(mount.origin.x.evaluated).toBe(1);
    expect(mount.origin.y.evaluated).toBe(2);
    expect(mount.axis?.z.evaluated).toBe(1);
    expect(shaft.origin.z.evaluated).toBe(6);
    expect(shaft.axis?.y.evaluated).toBe(1);
    expect(catalog.mateConnectors).toMatchObject([
      {
        name: 'mount',
        type: 'frame',
        origin: { kind: 'vec3', value: [1, 2, 3] },
        normal: [0, 0, 1],
      },
      {
        name: 'shaft',
        type: 'axis',
        origin: { kind: 'vec3', value: [4, 5, 6] },
        axis: [0, 1, 0],
      },
    ]);

    const fixture = arm.part('fixture', kcad.box(10, 10, 10));
    fixture
      .connector('mount', {
        type: 'frame',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        normal: [0, 0, 1],
      })
      .connector('shaft', {
        type: 'axis',
        origin: { kind: 'vec3', value: [0, 0, 0] },
        axis: [0, 1, 0],
      });

    expect(() => arm.mate('fasten', 'catalog.mount', 'fixture.mount', 'fastened')).not.toThrow();
    expect(() => arm.mate('turn', 'catalog.shaft', 'fixture.shaft', 'revolute')).not.toThrow();
    expect(arm.__mates().map((mate) => [mate.name, mate.type])).toEqual([
      ['fasten', 'fastened'],
      ['turn', 'revolute'],
    ]);
  });

  it('uses a promoted catalog connector for legacy opts.connect placement', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const base = arm.part('base', kcad.box(10, 10, 10), {
      at: [10, 0, 0],
      connectors: { socket: { origin: [0, 0, 0], axis: [1, 0, 0] } },
    });
    const catalogShape = kcad.box(10, 10, 10);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    const connected = arm.part('catalog', catalogShape, {
      connect: { connector: 'mount', to: base.connector('socket') },
    });

    expect(connected.at.x.evaluated).toBe(9);
    expect(connected.at.y.evaluated).toBe(-2);
    expect(connected.at.z.evaluated).toBe(-3);
  });

  it('does not promote generic auto connectors', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const genericShape = kcad.box(10, 10, 10);
    session.attachAutoConnectors(genericShape.id, [
      { name: 'heuristic-only', origin: [0, 0, 0], axis: [0, 0, 1] },
    ]);

    const part = arm.part('generic', genericShape);

    expect(part.connectors).toEqual({});
    expect(part.mateConnectors).toEqual([]);
    expect(() => part.connector('heuristic-only')).toThrow(/not defined on part 'generic'/);
  });

  it('rejects a collision between catalog and user-declared legacy connectors', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const catalogShape = kcad.box(10, 10, 10);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    expect(() => arm.part('catalog', catalogShape, {
      connectors: { mount: { origin: [0, 0, 0] } },
    })).toThrow(/declared both by the catalog part and assembly\.part options/);
  });

  it('applies declared literal translate and rotate transforms to catalog frames in order', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const catalogShape = kcad.box(10, 10, 10)
      .translate(10, 0, 0)
      .rotate([0, 0, 1], 90);
    session.attachCatalogConnectors(catalogShape.id, [
      {
        name: 'mount',
        type: 'frame',
        origin: [1, 0, 0],
        normal: [1, 0, 0],
      },
      {
        name: 'shaft',
        type: 'axis',
        origin: [1, 0, 0],
        axis: [1, 0, 0],
      },
    ]);

    const part = arm.part('catalog', catalogShape);
    const mount = part.mateConnectors.find((connector) => connector.name === 'mount');
    const shaft = part.mateConnectors.find((connector) => connector.name === 'shaft');

    expect(mount).toMatchObject({ name: 'mount', type: 'frame', origin: { kind: 'vec3' } });
    if (mount?.origin.kind !== 'vec3') throw new Error('catalog mount must have a Vec3 origin');
    expect(mount.origin.value[0]).toBeCloseTo(0, 10);
    expect(mount.origin.value[1]).toBeCloseTo(11, 10);
    expect(mount.normal?.[0]).toBeCloseTo(0, 10);
    expect(mount.normal?.[1]).toBeCloseTo(1, 10);
    expect(shaft).toMatchObject({
      name: 'shaft',
      type: 'axis',
      origin: { kind: 'vec3' },
    });
    if (shaft?.origin.kind !== 'vec3') throw new Error('catalog shaft must have a Vec3 origin');
    expect(shaft.origin.value[0]).toBeCloseTo(0, 10);
    expect(shaft.origin.value[1]).toBeCloseTo(11, 10);
    expect(shaft.origin.value[2]).toBeCloseTo(0, 10);
    expect(shaft.axis?.[0]).toBeCloseTo(0, 10);
    expect(shaft.axis?.[1]).toBeCloseTo(1, 10);
    expect(shaft.axis?.[2]).toBeCloseTo(0, 10);
    expect(part.connector('shaft').origin.x.evaluated).toBeCloseTo(0, 10);
    expect(part.connector('shaft').origin.y.evaluated).toBeCloseTo(11, 10);
    expect(part.connector('shaft').axis?.x.evaluated).toBeCloseTo(0, 10);
    expect(part.connector('shaft').axis?.y.evaluated).toBeCloseTo(1, 10);
  });

  it('rejects catalog connector promotion through scale', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const catalogShape = kcad.box(10, 10, 10).scale(2);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    expect(() => arm.part('catalog', catalogShape)).toThrow(/catalog connector.*scale/i);
  });

  it('rejects catalog connector promotion through reflection', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const catalogShape = kcad.box(10, 10, 10).reflect('xy');
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    expect(() => arm.part('catalog', catalogShape)).toThrow(/catalog connector.*reflect/i);
  });

  it('rejects catalog connector promotion through a ParamRef translate transform', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const offset = kcad.param('offset', 10);
    const catalogShape = kcad.box(10, 10, 10).translate(offset, 0, 0);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    expect(() => arm.part('catalog', catalogShape)).toThrow(/catalog connector.*ParamRef/i);
  });

  it('rejects catalog connector promotion through a ParamRef rotate transform', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const arm = kcad.assembly('arm');
    const degrees = kcad.param('degrees', 90);
    const catalogShape = kcad.box(10, 10, 10).rotate([0, 0, 1], degrees);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());

    expect(() => arm.part('catalog', catalogShape)).toThrow(/catalog connector.*ParamRef/i);
  });

  it('does not re-promote catalog connectors while flattening a subassembly', () => {
    const session = new CaptureSession();
    const kcad = createApi({ session });
    const source = kcad.assembly('source');
    const target = kcad.assembly('target');
    const catalogShape = kcad.box(10, 10, 10);
    session.attachCatalogConnectors(catalogShape.id, authoredConnectors());
    source.part('catalog', catalogShape);

    const imported = target.subAssembly('nested', source).part('catalog');

    expect(imported.connectors).toHaveProperty('mount');
    expect(imported.connectors).toHaveProperty('shaft');
    expect(imported.mateConnectors.map((connector) => connector.name)).toEqual(['mount', 'shaft']);
  });
});
