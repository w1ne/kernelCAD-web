// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import * as THREE from 'three';
import { useEffect } from 'react';
import type { FaceGeometry } from '../../../shared/worker/geometryEngine';
import { useConsolidatedGeometry } from './useConsolidatedGeometry';

const faceA: FaceGeometry = {
  vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
  faceId: 1,
};

const faceB: FaceGeometry = {
  vertices: new Float32Array([0, 0, 0, 2, 0, 0, 0, 2, 0]),
  normals: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
  indices: new Uint32Array([0, 1, 2]),
  faceId: 2,
};

function Harness({
  faces,
  onGeometry,
}: {
  faces: FaceGeometry[];
  onGeometry: (geometry: THREE.BufferGeometry | null) => void;
}) {
  const { geometry } = useConsolidatedGeometry(faces);
  useEffect(() => {
    onGeometry(geometry);
  }, [geometry, onGeometry]);
  return null;
}

describe('useConsolidatedGeometry', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('disposes replaced and unmounted merged geometries', () => {
    const disposeSpy = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const onGeometry = vi.fn();

    const { rerender, unmount } = render(
      <Harness faces={[faceA]} onGeometry={onGeometry} />,
    );
    expect(disposeSpy).not.toHaveBeenCalled();

    rerender(<Harness faces={[faceB]} onGeometry={onGeometry} />);
    expect(disposeSpy).toHaveBeenCalledTimes(1);

    unmount();
    expect(disposeSpy).toHaveBeenCalledTimes(2);
  });
});
