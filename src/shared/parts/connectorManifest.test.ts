import { describe, it, expect } from 'vitest';
import {
  validateConnectorManifest,
  type ConnectorManifest,
} from './connectorManifest';

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
});
