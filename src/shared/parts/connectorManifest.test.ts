// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect } from 'vitest';
import {
  validateHashBoundConnectorManifest,
  validateConnectorManifest,
  type ConnectorManifest,
} from './connectorManifestSchema';

describe('ConnectorManifest validator', () => {
  it('accepts a v1 manifest with required fields', () => {
    const m: ConnectorManifest = {
      schemaVersion: 1,
      partId: 'iso-4762-m3x12',
      family: 'socket-head-cap-screw',
      connectors: [
        {
          name: 'head-bearing',
          type: 'frame',
          origin: [0, 0, 0],
          normal: [0, 0, -1],
        },
        {
          name: 'thread-tip',
          type: 'axis',
          origin: [0, 0, -12],
          axis: [0, 0, 1],
        },
      ],
    };
    expect(() => validateConnectorManifest(m)).not.toThrow();
  });

  it('rejects a manifest missing schemaVersion', () => {
    expect(() =>
      validateConnectorManifest({
        partId: 'x',
        family: 'x',
        connectors: [],
      } as unknown as ConnectorManifest),
    ).toThrow(/schemaVersion/);
  });

  it('rejects mutable optional manifest metadata', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [],
        license: { mutable: true },
        attribution: ['not', 'a', 'string'],
        generatedAt: 42,
      }),
    ).toThrow(/license/i);
  });

  it('rejects schemaVersion !== 1', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 2,
        partId: 'x',
        family: 'x',
        connectors: [],
      } as unknown as ConnectorManifest),
    ).toThrow(/schemaVersion/);
  });

  it('rejects a connector name that fails the ref-safe grammar', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'head.bearing',
            type: 'frame',
            origin: [0, 0, 0],
            normal: [0, 0, 1],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow();
  });

  it('rejects duplicate connector names', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'mount',
            type: 'frame',
            origin: [0, 0, 0],
            normal: [0, 0, 1],
          },
          {
            name: 'mount',
            type: 'axis',
            origin: [0, 0, 0],
            axis: [0, 0, 1],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow(/duplicate/i);
  });

  it('rejects a non-object connector entry', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [null],
      }),
    ).toThrow(/connector must be an object/i);
  });

  it('rejects connector fields inherited from a non-plain object', () => {
    const connector = Object.assign(Object.create({ normal: [0, 0, 1] }), {
      name: 'mount',
      type: 'frame',
      origin: [0, 0, 0],
    });

    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [connector],
      }),
    ).toThrow(/connector must be an object/i);
  });

  it('rejects non-finite connector vectors', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'mount',
            type: 'frame',
            origin: [0, 0, 0],
            normal: [0, Number.NaN, 1],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow(/finite/i);
  });

  it('rejects connector vectors that are not exactly three values', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'mount',
            type: 'frame',
            origin: [0, 0],
            normal: [0, 0, 1],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow(/three-vector/i);
  });

  it('rejects a zero frame normal', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'mount',
            type: 'frame',
            origin: [0, 0, 0],
            normal: [0, 0, 0],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow(/normal/i);
  });

  it('rejects a zero axis direction', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'mount-axis',
            type: 'axis',
            origin: [0, 0, 0],
            axis: [0, 0, 0],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow(/axis/i);
  });

  it('rejects connector fields that do not match the declared type', () => {
    expect(() =>
      validateConnectorManifest({
        schemaVersion: 1,
        partId: 'iso-4762-m3x12',
        family: 'socket-head-cap-screw',
        connectors: [
          {
            name: 'mount',
            type: 'frame',
            origin: [0, 0, 0],
            normal: [0, 0, 1],
            axis: [0, 0, 1],
          },
        ],
      } as unknown as ConnectorManifest),
    ).toThrow(/axis|unexpected/i);
  });

  it('rejects a manifest whose hash is not bound to the expected geometry', () => {
    expect(() =>
      validateHashBoundConnectorManifest(
        {
          schemaVersion: 1,
          partId: 'iso-4762-m3x12',
          family: 'socket-head-cap-screw',
          geometrySha256: 'a'.repeat(64),
          connectors: [],
        },
        {
          partId: 'iso-4762-m3x12',
          family: 'socket-head-cap-screw',
          geometrySha256: 'b'.repeat(64),
        },
      ),
    ).toThrow(/geometrySha256/);
  });

  it('rejects a non-lowercase hash-bound geometry digest', () => {
    expect(() =>
      validateHashBoundConnectorManifest(
        {
          schemaVersion: 1,
          partId: 'iso-4762-m3x12',
          family: 'socket-head-cap-screw',
          geometrySha256: 'A'.repeat(64),
          connectors: [],
        },
        {
          partId: 'iso-4762-m3x12',
          family: 'socket-head-cap-screw',
          geometrySha256: 'a'.repeat(64),
        },
      ),
    ).toThrow(/geometrySha256/);
  });
});
