// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { beforeAll, describe, expect, it } from 'vitest';
import * as replicad from 'replicad';
import type { Edge } from 'replicad';
import { initOcct } from './occtBackend';
import { meshShape } from './meshing';
import { resolveStableEdgeId, stableEdgeIdForEdge } from './edgeIdentity';

beforeAll(async () => { await initOcct(); });

describe('stable BREP edge identity', () => {
  it('assigns the same geometry IDs when the same model is evaluated twice', () => {
    const first = replicad.makeBaseBox(20, 10, 5);
    const second = replicad.makeBaseBox(20, 10, 5);
    const firstIds = (first as unknown as { edges: Edge[] }).edges.map(stableEdgeIdForEdge).sort();
    const secondIds = (second as unknown as { edges: Edge[] }).edges.map(stableEdgeIdForEdge).sort();

    expect(firstIds).toEqual(secondIds);
  });

  it('keeps an edge ID when unrelated geometry is added to the model', () => {
    const box = replicad.makeBaseBox(20, 10, 5);
    const originalIds = (box as unknown as { edges: Edge[] }).edges.map(stableEdgeIdForEdge);
    const expanded = replicad.compoundShapes([
      replicad.makeBaseBox(20, 10, 5),
      replicad.makeSphere(2).translate(100, 0, 0),
    ]);
    const expandedIds = new Set((expanded as unknown as { edges: Edge[] }).edges.map(stableEdgeIdForEdge));

    for (const id of originalIds) expect(expandedIds.has(id)).toBe(true);
  });

  it('resolves an ID to the unique edge with the same sampled geometry', () => {
    const shape = replicad.makeBaseBox(20, 10, 5);
    const edges = (shape as unknown as { edges: Edge[] }).edges;
    const target = edges.find(edge => {
      const a = edge.pointAt(0.25);
      const b = edge.pointAt(0.75);
      return Math.abs(a.x - b.x) > 1 && Math.abs(a.y - b.y) < 1e-5;
    });
    expect(target).toBeDefined();
    const id = stableEdgeIdForEdge(target!);
    const resolved = resolveStableEdgeId(edges, id);
    expect(resolved.status).toBe('unique');
    if (resolved.status !== 'unique') return;
    expect(resolved.edge.pointAt(0.5)).toEqual(target!.pointAt(0.5));
    expect(resolveStableEdgeId([target!, target!], id)).toMatchObject({ status: 'ambiguous', matches: 2 });
  });

  it('attaches each mesh range ID to its matching BREP edge geometrically', () => {
    const mesh = meshShape(replicad.makeBaseBox(20, 10, 5));
    expect(mesh?.edgeStableIds).toBeDefined();
    expect(mesh?.edgeStableIds?.length).toBe(mesh?.edgeRanges?.length / 2);
    const shape = replicad.makeBaseBox(20, 10, 5);
    const edges = (shape as unknown as { edges: Edge[] }).edges;
    for (let edgeIndex = 0; edgeIndex < mesh!.edgeStableIds!.length; edgeIndex += 1) {
      const id = mesh!.edgeStableIds![edgeIndex]!;
      const resolved = resolveStableEdgeId(edges, id);
      expect(resolved.status).toBe('unique');
      if (resolved.status !== 'unique') continue;
      const start = mesh!.edgeRanges![edgeIndex * 2]!;
      const count = mesh!.edgeRanges![edgeIndex * 2 + 1]!;
      const a = [mesh!.edges![start * 3]!, mesh!.edges![start * 3 + 1]!, mesh!.edges![start * 3 + 2]!];
      const endVertex = start + count - 1;
      const b = [mesh!.edges![endVertex * 3]!, mesh!.edges![endVertex * 3 + 1]!, mesh!.edges![endVertex * 3 + 2]!];
      const midpoint = resolved.edge.pointAt(0.5);
      expect(Math.hypot(midpoint.x - (a[0]! + b[0]!) / 2, midpoint.y - (a[1]! + b[1]!) / 2, midpoint.z - (a[2]! + b[2]!) / 2))
        .toBeLessThan(1e-5);
    }
  });
});
