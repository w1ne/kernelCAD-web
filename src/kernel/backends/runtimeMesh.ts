// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export interface RuntimeMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  faceID?: Uint32Array;
}
