// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Unit cover for the DAG rule the live-docs viewer renders through. The browser
// example test exercises it against real geometry; this pins the shapes that
// are awkward to reach that way (assemblies, cutters, empty input).

import { describe, it, expect } from 'vitest';
import { selectTerminalFeatures } from './featureMeshing';
import type { FeatureMesh } from './featureMeshing';

/** Minimal stand-in — the rule reads only featureId and predecessors. */
function mesh(featureId: string, predecessors: string[] = []): FeatureMesh {
  return { featureId, featureKind: 'box', predecessors, faces: [] } as unknown as FeatureMesh;
}

describe('selectTerminalFeatures', () => {
  it('keeps the end of a modifier chain and drops what it consumed', () => {
    const features = [mesh('box_1'), mesh('shell_1', ['box_1']), mesh('fillet_1', ['shell_1'])];
    expect(selectTerminalFeatures(features).map((f) => f.featureId)).toEqual(['fillet_1']);
  });

  it('drops both operands of a boolean, not just one', () => {
    const features = [mesh('box_1'), mesh('sphere_1'), mesh('boolean_1', ['box_1', 'sphere_1'])];
    expect(selectTerminalFeatures(features).map((f) => f.featureId)).toEqual(['boolean_1']);
  });

  it('keeps every part of a solved assembly', () => {
    // The reason this returns a set. "The last record" would render one part of
    // a mechanism and silently drop the rest.
    const features = [mesh('solved__base'), mesh('solved__lid')];
    expect(selectTerminalFeatures(features).map((f) => f.featureId)).toEqual([
      'solved__base',
      'solved__lid',
    ]);
  });

  it('keeps unconsumed construction geometry alongside the solid', () => {
    // A Curve3D used only for measurement is terminal too. It carries no faces,
    // so the viewer skips it there — this function is not the place to decide
    // what is drawable.
    const features = [mesh('curve3d_1'), mesh('surfaceThicken_1')];
    expect(selectTerminalFeatures(features).map((f) => f.featureId)).toEqual([
      'curve3d_1',
      'surfaceThicken_1',
    ]);
  });

  it('returns nothing for no features rather than inventing a result', () => {
    expect(selectTerminalFeatures([])).toEqual([]);
  });

  it('preserves input order', () => {
    const features = [mesh('a'), mesh('b'), mesh('c', ['a'])];
    expect(selectTerminalFeatures(features).map((f) => f.featureId)).toEqual(['b', 'c']);
  });
});
