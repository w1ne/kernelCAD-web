// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/modeling/export/urdf/urdfWrite.ts
//
// IO wrapper around urdfSerialize. Writes the .urdf file + the sibling
// meshes/ directory. Per-link STL via OcctBackend.exportSTLAsync().

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Assembly } from '../../capture/assembly';
import { urdfSerialize, type UrdfSerializeOptions, type UrdfSerializeResult } from './urdfSerializer';

export interface UrdfWriteResult extends UrdfSerializeResult {
  bytesWritten: number;
  meshFilesWritten: number;
}

export async function urdfWriteAsync(
  arm: Assembly,
  outputPath: string,
  opts: UrdfSerializeOptions,
): Promise<UrdfWriteResult> {
  const r = await urdfSerialize(arm, opts);
  if (r.urdf === '') {
    return { ...r, bytesWritten: 0, meshFilesWritten: 0 };
  }
  const baseDir = dirname(outputPath);
  await mkdir(join(baseDir, 'meshes'), { recursive: true });
  await writeFile(outputPath, r.urdf, 'utf8');
  let meshFilesWritten = 0;
  for (const m of r.meshPaths) {
    const bytes = await m.shape.exportSTLAsync();
    await writeFile(join(baseDir, m.relPath), Buffer.from(bytes));
    meshFilesWritten++;
  }
  return { ...r, bytesWritten: r.urdf.length, meshFilesWritten };
}
