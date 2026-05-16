import { describe, it, expect, beforeAll } from 'vitest';
import {
  makeConnector,
  resolveConnectorOrigin,
  type Connector,
  type ConnectorOrigin,
} from './connector';
import { CaptureSession } from '../capture/captureSession';
import { createApi } from '../api';
import { initOcct } from '../../kernel/backends/occt/occtBackend';

describe('Connector (numeric origin)', () => {
  it('creates a frame connector with Vec3 origin', () => {
    const c: Connector = makeConnector({
      name: 'mountFlange',
      type: 'frame',
      origin: { kind: 'vec3', value: [10, 0, 5] },
    });
    expect(c.name).toBe('mountFlange');
    expect(c.type).toBe('frame');
    expect(c.origin.kind).toBe('vec3');
  });

  it('rejects duplicate-name connector creation via factory', () => {
    expect(() => makeConnector({ name: '', type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } }))
      .toThrow(/connector name must be non-empty/i);
  });

  it('accepts all four connector types', () => {
    for (const t of ['frame', 'axis', 'planar', 'ball'] as const) {
      const c = makeConnector({ name: 't', type: t, origin: { kind: 'vec3', value: [0, 0, 0] } });
      expect(c.type).toBe(t);
    }
  });
});

describe('Connector (topology-bound origin)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('resolves face-center to the face centroid Vec3', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);  // anchored at origin corner: spans [0,10]^3
    const resolved = await resolveConnectorOrigin(box, {
      kind: 'topology',
      query: { kind: 'face-center', name: 'top' },
    });
    expect(resolved.kind).toBe('vec3');
    // Top face centroid: x=5, y=5, z=10.
    expect(resolved.value[0]).toBeCloseTo(5, 5);
    expect(resolved.value[1]).toBeCloseTo(5, 5);
    expect(resolved.value[2]).toBeCloseTo(10, 5);
  });

  it('throws assembly.connector.topology-not-resolvable on missing face name', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);
    await expect(
      resolveConnectorOrigin(box, {
        kind: 'topology',
        query: { kind: 'face-center', name: 'nonexistent' },
      }),
    ).rejects.toThrow(/assembly\.connector\.topology-not-resolvable/);
  });

  it('passes through vec3 origin unchanged', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);
    const o: ConnectorOrigin = { kind: 'vec3', value: [1, 2, 3] };
    const resolved = await resolveConnectorOrigin(box, o);
    expect(resolved.kind).toBe('vec3');
    expect(resolved.value).toEqual([1, 2, 3]);
  });
});

describe('Connector (non-canonical face labels)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it("resolves a user-defined face label via faceLabels: { lid: 'top' }", async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10, false, { faceLabels: { lid: 'top' } });
    const resolved = await resolveConnectorOrigin(
      box,
      { kind: 'topology', query: { kind: 'face-center', name: 'lid' } },
      session.getRecords(),
    );
    expect(resolved.kind).toBe('vec3');
    // Top face center = (5, 5, 10) on a 10x10x10 box anchored at origin corner.
    expect(resolved.value[0]).toBeCloseTo(5, 5);
    expect(resolved.value[1]).toBeCloseTo(5, 5);
    expect(resolved.value[2]).toBeCloseTo(10, 5);
  });

  it('throws topology-not-resolvable when records are missing and label is non-canonical', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10, false, { faceLabels: { lid: 'top' } });
    // Without records, only canonical names should work; 'lid' is non-canonical.
    await expect(
      resolveConnectorOrigin(box, {
        kind: 'topology',
        query: { kind: 'face-center', name: 'lid' },
      }),
    ).rejects.toThrow(/assembly\.connector\.topology-not-resolvable/);
  });
});

describe('Connector (vertex queries)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('throws topology-not-resolvable for vertex queries (deferred to v0.7)', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);
    await expect(
      resolveConnectorOrigin(
        box,
        { kind: 'topology', query: { kind: 'vertex', name: 'corner-tfr' } },
        session.getRecords(),
      ),
    ).rejects.toThrow(/vertex labeling not yet supported|vertex query/);
  });
});

describe('Connector (edge-axis queries)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it('resolves a canonical box edge axis by name (edge-top-front)', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);
    // 'edge-top-front' on a 10x10x10 box anchored at origin = edge at z=10, y=0,
    // running along X from (0, 0, 10) to (10, 0, 10). Midpoint = (5, 0, 10).
    const resolved = await resolveConnectorOrigin(
      box,
      { kind: 'topology', query: { kind: 'edge-axis', name: 'edge-top-front' } },
      session.getRecords(),
    );
    expect(resolved.kind).toBe('vec3');
    expect(resolved.value[0]).toBeCloseTo(5, 5);
    expect(resolved.value[1]).toBeCloseTo(0, 5);
    expect(resolved.value[2]).toBeCloseTo(10, 5);
  });

  it('resolves canonical box edge "edge-right-top" (Y-running edge at x=max,z=max)', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);
    const resolved = await resolveConnectorOrigin(
      box,
      { kind: 'topology', query: { kind: 'edge-axis', name: 'edge-right-top' } },
      session.getRecords(),
    );
    expect(resolved.kind).toBe('vec3');
    // Right(x=10) ∩ Top(z=10): edge running along Y from (10,0,10) to (10,10,10).
    expect(resolved.value[0]).toBeCloseTo(10, 5);
    expect(resolved.value[1]).toBeCloseTo(5, 5);
    expect(resolved.value[2]).toBeCloseTo(10, 5);
  });

  it('throws topology-not-resolvable on unknown edge name', async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    const box = api.box(10, 10, 10);
    await expect(
      resolveConnectorOrigin(
        box,
        { kind: 'topology', query: { kind: 'edge-axis', name: 'edge-bogus' } },
        session.getRecords(),
      ),
    ).rejects.toThrow(/assembly\.connector\.topology-not-resolvable/);
  });
});

describe('Connector (transformed primitives)', () => {
  beforeAll(async () => {
    await initOcct();
  });

  it("resolves face-center correctly after .translate", async () => {
    const session = new CaptureSession();
    const api = createApi({ session });
    // Box anchored at origin corner; translated by (5, 0, 0) → spans [5,15] x [0,10] x [0,10].
    const box = api.box(10, 10, 10).translate(5, 0, 0);
    const resolved = await resolveConnectorOrigin(
      box,
      { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
      session.getRecords(),
    );
    expect(resolved.kind).toBe('vec3');
    // Top face center = (x_min+x_max)/2=10, (y_min+y_max)/2=5, z=z_max=10.
    expect(resolved.value[0]).toBeCloseTo(10, 5);
    expect(resolved.value[1]).toBeCloseTo(5, 5);
    expect(resolved.value[2]).toBeCloseTo(10, 5);
  });
});
