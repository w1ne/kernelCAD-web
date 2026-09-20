// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Characterisation tests for connectorTopology's `findEdgeByName`, reached
// through the public `resolveTopologyOriginOnBackend` entry point. Pin the
// accepted edge-name grammar, the order-insensitivity of the two-face box
// form, the cylinder-cap form, and the exact topology-not-resolvable error
// strings before the resolver is split into per-form helpers.
import { beforeAll, describe, expect, it } from 'vitest';
import { initOcct, OcctBackend } from '../../../../src/kernel/backends/occt/occtBackend';
import { resolveTopologyOriginOnBackend } from '../../../../src/modeling/backends/occt/connectorTopology';
import type { TopologyQuery } from '../../../../src/modeling/mates/connector';

const edgeAxis = (name: string): TopologyQuery => ({ kind: 'edge-axis', name });

const notResolvable = (name: string, kind: string): string =>
  `assembly.connector.topology-not-resolvable: edge '${name}' not found on shape (kind='${kind}'). Use 'edge-<face1>-<face2>' (e.g. 'edge-top-front') for box edges or 'edge-top'/'edge-bottom' for cylinder caps.`;

describe('connectorTopology.findEdgeByName characterisation', () => {
  beforeAll(async () => { await initOcct(); }, 60000);

  it('resolves a box edge from two canonical faces, order-insensitively', () => {
    const box = OcctBackend.box(20, 20, 10);
    expect(resolveTopologyOriginOnBackend(box, edgeAxis('edge-top-front'))).toEqual([10, 0, 10]);
    expect(resolveTopologyOriginOnBackend(box, edgeAxis('edge-front-top'))).toEqual([10, 0, 10]);
    expect(resolveTopologyOriginOnBackend(box, edgeAxis('edge-top-back'))).toEqual([10, 20, 10]);
    expect(resolveTopologyOriginOnBackend(box, edgeAxis('edge-bottom-left'))).toEqual([0, 10, 0]);
  });

  it('resolves cylinder cap edges to a point on the cap circle', () => {
    const cyl = OcctBackend.cylinder(10, 5);
    const top = resolveTopologyOriginOnBackend(cyl, edgeAxis('edge-top'));
    expect(top[2]).toBeCloseTo(10, 6);
    expect(Math.hypot(top[0], top[1])).toBeCloseTo(5, 6);
    const bottom = resolveTopologyOriginOnBackend(cyl, edgeAxis('edge-bottom'));
    expect(bottom[2]).toBeCloseTo(0, 6);
    expect(Math.hypot(bottom[0], bottom[1])).toBeCloseTo(5, 6);
  });

  it('throws the documented message on miss forms', () => {
    const box = OcctBackend.box(20, 20, 10);
    // Single-face cap form on a box.
    expect(() => resolveTopologyOriginOnBackend(box, edgeAxis('edge-top')))
      .toThrow(notResolvable('edge-top', 'box'));
    // Two canonical faces that share no edge.
    expect(() => resolveTopologyOriginOnBackend(box, edgeAxis('edge-top-bottom')))
      .toThrow(notResolvable('edge-top-bottom', 'box'));
    // Non-canonical face token.
    expect(() => resolveTopologyOriginOnBackend(box, edgeAxis('edge-mid-front')))
      .toThrow(notResolvable('edge-mid-front', 'box'));
    // Not an edge- prefixed name at all.
    expect(() => resolveTopologyOriginOnBackend(box, edgeAxis('top-front')))
      .toThrow(notResolvable('top-front', 'box'));
    // Empty suffix / too many parts.
    expect(() => resolveTopologyOriginOnBackend(box, edgeAxis('edge-')))
      .toThrow(notResolvable('edge-', 'box'));
    expect(() => resolveTopologyOriginOnBackend(box, edgeAxis('edge-top-front-left')))
      .toThrow(notResolvable('edge-top-front-left', 'box'));
  });
});
