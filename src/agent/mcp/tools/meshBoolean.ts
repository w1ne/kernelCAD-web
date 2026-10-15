// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { lstat, open, realpath } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';
import {
  booleanTriangleMeshes,
  MeshBooleanError,
  type MeshBooleanOperation,
} from '../../../modeling/runtime/meshBoolean';
import { detectMeshFormat, parseMeshBytes, type MeshFormat } from '../../reconstruct/meshIO';

export interface MeshBooleanSource {
  file?: string;
  data?: string;
  format?: MeshFormat;
}

export interface MeshBooleanToolInput {
  operation: MeshBooleanOperation;
  a: MeshBooleanSource;
  b: MeshBooleanSource;
  toleranceMm?: number;
  maxTriangles?: number;
  /** Root directory from which file operands may be read. Defaults to process.cwd(). */
  workspaceRoot?: string;
}

export interface MeshBooleanToolOutput {
  ok: boolean;
  operation?: MeshBooleanOperation;
  volumeMm3?: number;
  triangleCount?: number;
  format?: 'stl';
  data_base64?: string;
  error?: string;
}

const DEFAULT_MAX_TRIANGLES = 100_000;
const MAX_BYTES = 50 * 1024 * 1024;

async function readBoundedFile(path: string, workspaceRoot: string): Promise<Uint8Array> {
  const handle = await open(path, 'r');
  try {
    const [openedStat, namedStat, openedPath] = await Promise.all([
      handle.stat(), lstat(path), realpath(path),
    ]);
    const rel = relative(workspaceRoot, openedPath);
    if (rel === '..' || rel.startsWith(`..${sep}`) || rel.startsWith(sep)) {
      throw new MeshBooleanError('Mesh file must be inside the workspace root.');
    }
    if (openedStat.dev !== namedStat.dev || openedStat.ino !== namedStat.ino) {
      throw new MeshBooleanError('Mesh file changed while it was being opened.');
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    const buffer = new Uint8Array(64 * 1024);
    while (true) {
      const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, MAX_BYTES + 1 - total), null);
      if (bytesRead === 0) break;
      total += bytesRead;
      if (total > MAX_BYTES) throw new MeshBooleanError('Mesh input must be between 1 byte and 50 MB.');
      chunks.push(buffer.slice(0, bytesRead));
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
  } finally {
    await handle.close();
  }
}

async function readSource(source: MeshBooleanSource, workspaceRoot: string) {
  if (!source || (source.file === undefined) === (source.data === undefined)) {
    throw new MeshBooleanError('Each operand must provide exactly one of file or data.');
  }
  let bytes: Uint8Array;
  let name: string | undefined;
  if (source.file !== undefined) {
    name = basename(source.file);
    const root = await realpath(workspaceRoot);
    const filePath = resolve(root, source.file);
    bytes = await readBoundedFile(filePath, root);
  } else {
    if (typeof source.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(source.data)) {
      throw new MeshBooleanError('Mesh data must be valid base64.');
    }
    bytes = new Uint8Array(Buffer.from(source.data, 'base64'));
    if (Buffer.from(bytes).toString('base64') !== source.data) {
      throw new MeshBooleanError('Mesh data must be valid base64.');
    }
  }
  if (bytes.length === 0 || bytes.length > MAX_BYTES) throw new MeshBooleanError('Mesh input must be between 1 byte and 50 MB.');
  const format = source.format ?? detectMeshFormat(name, bytes);
  return parseMeshBytes(bytes, format);
}

function asTriangleMesh(soup: ReturnType<typeof parseMeshBytes>) {
  // The mesh readers return triangle soup, so identical corners across
  // neighboring faces need shared indices before edge-manifold validation.
  const vertexByPosition = new Map<string, number>();
  const positions: number[] = [];
  const indices = new Uint32Array(soup.positions.length / 3);
  for (let corner = 0; corner < indices.length; corner++) {
    const offset = corner * 3;
    const x = soup.positions[offset], y = soup.positions[offset + 1], z = soup.positions[offset + 2];
    const key = `${x},${y},${z}`;
    let index = vertexByPosition.get(key);
    if (index === undefined) {
      index = positions.length / 3;
      positions.push(x, y, z);
      vertexByPosition.set(key, index);
    }
    indices[corner] = index;
  }
  return { positions: Float64Array.from(positions), indices };
}

function encodeBinaryStl(positions: Float32Array, indices: Uint32Array): Uint8Array {
  const triangleCount = indices.length / 3;
  const bytes = new Uint8Array(84 + triangleCount * 50);
  const view = new DataView(bytes.buffer);
  view.setUint32(80, triangleCount, true);
  for (let tri = 0; tri < triangleCount; tri++) {
    const base = 84 + tri * 50;
    const vi = [indices[tri * 3], indices[tri * 3 + 1], indices[tri * 3 + 2]];
    const a = vi[0] * 3, b = vi[1] * 3, c = vi[2] * 3;
    const ab = [positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]];
    const ac = [positions[c] - positions[a], positions[c + 1] - positions[a + 1], positions[c + 2] - positions[a + 2]];
    const normal = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const length = Math.hypot(...normal) || 1;
    for (let k = 0; k < 3; k++) view.setFloat32(base + k * 4, normal[k] / length, true);
    for (let k = 0; k < 3; k++) {
      for (let axis = 0; axis < 3; axis++) view.setFloat32(base + 12 + k * 12 + axis * 4, positions[vi[k] * 3 + axis], true);
    }
    view.setUint16(base + 48, 0, true);
  }
  return bytes;
}

function validateOperationAndLimit(input: MeshBooleanToolInput): number {
  if (!input || !['union', 'subtract', 'intersect'].includes(input.operation)) {
    throw new MeshBooleanError("operation must be 'union', 'subtract', or 'intersect'.");
  }
  const maxTriangles = input.maxTriangles ?? DEFAULT_MAX_TRIANGLES;
  if (!Number.isInteger(maxTriangles) || maxTriangles < 4 || maxTriangles > DEFAULT_MAX_TRIANGLES) {
    throw new MeshBooleanError(`maxTriangles must be an integer from 4 to ${DEFAULT_MAX_TRIANGLES}.`);
  }
  return maxTriangles;
}

function validateUnits(leftSoup: Awaited<ReturnType<typeof readSource>>, rightSoup: Awaited<ReturnType<typeof readSource>>): void {
  if (leftSoup.format !== '3mf' && rightSoup.format !== '3mf') return;
  const nonMillimeter3mf = (soup: typeof leftSoup) => soup.format === '3mf' && soup.unit !== 'millimeter';
  const provenance = (soup: typeof leftSoup) => soup.format === '3mf' ? `3MF (${soup.unit})` : `${soup.format} (assumed mm)`;
  const mismatchedDeclaredUnits = leftSoup.format === '3mf' && rightSoup.format === '3mf' && leftSoup.unit !== rightSoup.unit;
  const missingDeclaredUnits = (nonMillimeter3mf(leftSoup) && !rightSoup.unitDeclared) ||
    (nonMillimeter3mf(rightSoup) && !leftSoup.unitDeclared);
  if (mismatchedDeclaredUnits || missingDeclaredUnits) {
    throw new MeshBooleanError(`Mesh operands use different unit provenance: ${provenance(leftSoup)} and ${provenance(rightSoup)}. Use matching units before combining.`);
  }
}

/** MCP handler for file-backed mesh Booleans. The returned STL can be re-imported with import_step. */
export async function meshBooleanTool(input: MeshBooleanToolInput): Promise<MeshBooleanToolOutput> {
  try {
    const maxTriangles = validateOperationAndLimit(input);
    const workspaceRoot = input.workspaceRoot ?? process.cwd();
    const [leftSoup, rightSoup] = await Promise.all([
      readSource(input.a, workspaceRoot), readSource(input.b, workspaceRoot),
    ]);
    validateUnits(leftSoup, rightSoup);
    const leftCount = leftSoup.positions.length / 9;
    const rightCount = rightSoup.positions.length / 9;
    if (leftCount > maxTriangles || rightCount > maxTriangles) {
      throw new MeshBooleanError(`Each input must contain at most ${maxTriangles} triangles.`);
    }
    const result = await booleanTriangleMeshes(input.operation, asTriangleMesh(leftSoup), asTriangleMesh(rightSoup), {
      tolerance: input.toleranceMm,
    });
    const triangleCount = result.indices.length / 3;
    if (triangleCount > maxTriangles) throw new MeshBooleanError(`Boolean result has ${triangleCount} triangles, over the ${maxTriangles} limit.`);
    return {
      ok: true,
      operation: input.operation,
      volumeMm3: result.volume,
      triangleCount,
      format: 'stl',
      data_base64: Buffer.from(encodeBinaryStl(result.positions, result.indices)).toString('base64'),
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
