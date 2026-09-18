// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/geometry/curveCarriers.ts
//
// Narrow carrier interfaces that let kernel-side code (the verb-nurbs
// analytics bridge) depend on the minimal shape it needs from modeling's
// Curve3D / SurfaceProxy, without importing the modeling module itself.
import type { FeatureId } from '../../shared/intent/types';
import type { Curve3DMetadata } from '../../shared/intent/curve3dRecord';
import type { SurfaceId, SurfaceRecord } from '../../shared/intent/surfaceRecord';

/** The subset of a Curve3D proxy the kernel-side analytics bridge needs. */
export interface Curve3DMetadataCarrier {
  readonly id: FeatureId;
  readonly metadata: Curve3DMetadata;
}

/** The subset of a SurfaceProxy the kernel-side analytics bridge needs. */
export interface SurfaceRecordCarrier {
  readonly id: SurfaceId;
  __getRecord(): SurfaceRecord | undefined;
}
