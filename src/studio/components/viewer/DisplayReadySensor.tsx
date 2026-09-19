// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';

/** True when at least one face has triangle indices (non-empty mesh). */
export function hasNonemptyGeometry(geometries: GeometryResult[]): boolean {
  return geometries.some((g) =>
    g.faces.some((f) => f.indices.length >= 3 && f.vertices.length >= 9),
  );
}

/**
 * Fires `onDisplayReady` once after nonempty geometry is present and at least
 * two animation frames have run (camera fit + first submitted frame).
 * iframe `load` alone is not enough for embeds.
 */
export function DisplayReadySensor({
  geometries,
  onDisplayReady,
}: {
  geometries: GeometryResult[];
  onDisplayReady?: () => void;
}) {
  const firedRef = useRef(false);
  const framesWithGeomRef = useRef(0);
  const onReadyRef = useRef(onDisplayReady);
  onReadyRef.current = onDisplayReady;

  useEffect(() => {
    firedRef.current = false;
    framesWithGeomRef.current = 0;
  }, [geometries]);

  useFrame(() => {
    if (!onReadyRef.current || firedRef.current) return;
    if (!hasNonemptyGeometry(geometries)) {
      framesWithGeomRef.current = 0;
      return;
    }
    framesWithGeomRef.current += 1;
    // Frame 1: CameraHandler schedules immediate fit. Frame 2+: fit applied + drawn.
    if (framesWithGeomRef.current < 2) return;
    firedRef.current = true;
    onReadyRef.current();
  });

  return null;
}
