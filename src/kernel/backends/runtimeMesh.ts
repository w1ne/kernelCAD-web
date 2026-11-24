// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { PBRMaterial } from '../../shared/intent/material';

/** One material group of a composite display mesh (GLB part, PCB assembly).
 *  Buffers are in the same Z-up, millimetre frame as the parent RuntimeMesh. */
export interface RuntimeSubMesh {
  name?: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  uv?: Float32Array;
  colors?: Float32Array;
  material?: PBRMaterial;
}

export interface RuntimeMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  faceID?: Uint32Array;
  /** Composite material groups. When present the renderer builds one mesh per
   *  entry so each imported material keeps its own surface response. */
  subMeshes?: RuntimeSubMesh[];
}
