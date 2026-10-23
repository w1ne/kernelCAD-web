// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { GeometryResult } from '../../../shared/worker/geometryEngine';
import { markParamEdit } from '../../browserKernel/paramEditPerf';

/**
 * Benchmark probe (mounted only when `__kernelcadParamPerf` is defined):
 * marks when new geometry reaches the viewer and when the next frame that
 * draws it has been rendered. r3f runs frame subscribers and then renders in
 * one animation-frame callback, so a microtask queued here runs after that
 * frame's `gl.render`. It does not prove GPU completion or scan-out.
 */
export function ParamEditFrameProbe({ geometries }: { geometries: GeometryResult[] }) {
  const pendingRef = useRef(false);
  useLayoutEffect(() => {
    markParamEdit('installed');
    pendingRef.current = true;
  }, [geometries]);
  useFrame(() => {
    if (!pendingRef.current) return;
    pendingRef.current = false;
    queueMicrotask(() => { markParamEdit('frame'); });
  });
  return null;
}
