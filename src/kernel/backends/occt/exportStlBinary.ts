// src/kernel/backends/occt/exportStlBinary.ts
import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);
// At source: src/kernel/backends/occt/exportStlBinary.ts → ../../../../package.json (4 up)
// At bundle: dist/cli/index.js → ../../package.json (2 up)
function loadPkg(): { version: string } {
  for (const rel of ['../../../../package.json', '../../package.json']) {
    try {
      return requireFromHere(rel) as { version: string };
    } catch {
      // try next
    }
  }
  return { version: 'unknown' };
}
const pkg = loadPkg();
const KERNELCAD_VERSION = pkg.version;

const HEADER_SIZE = 80;
const TRIANGLE_COUNT_SIZE = 4;
const TRIANGLE_RECORD_SIZE = 50; // 12 (normal) + 36 (3 vertices) + 2 (attribute)

/**
 * Raw mesh data as produced by Replicad's ShapeMesh or any equivalent source.
 *
 * - `vertices`: flat array of floats [x0,y0,z0, x1,y1,z1, ...] — one
 *   coordinate triple per vertex.
 * - `triangles`: flat array of integer indices into `vertices` — three
 *   consecutive indices form one triangle face.
 */
export interface MeshData {
  vertices: number[] | Float32Array;
  triangles: number[] | Uint32Array;
}

/**
 * Encode mesh data as a binary STL Buffer.
 *
 * Binary STL format:
 *   Bytes 0..79    80-byte header (free-form text or zeros)
 *   Bytes 80..83   uint32 LE — triangle count
 *   Per triangle (50 bytes each):
 *     Bytes 0..11   3× float32 LE  — normal vector (computed from vertices)
 *     Bytes 12..47  9× float32 LE  — vertex 1, 2, 3 (xyz each)
 *     Bytes 48..49  uint16 LE      — attribute byte count (0)
 *
 * Normal vectors are computed as the cross product of (v1-v0) × (v2-v0),
 * normalized to unit length. Degenerate triangles (zero-area) emit a zero
 * normal, which is spec-compliant.
 *
 * @param mesh    Vertex/index mesh data
 * @param header  Up to 80 ASCII characters written to the header field.
 *                Defaults to "kernelcad <version> <YYYY-MM-DD>". The header
 *                MUST NOT start with "solid" — some lenient parsers use the
 *                prefix to detect ASCII vs binary format.
 */
function buildDefaultHeader(): string {
  const isoDate = new Date().toISOString().slice(0, 10);
  return `kernelcad ${KERNELCAD_VERSION} ${isoDate}`;
}

export function encodeBinaryStl(
  mesh: MeshData,
  header: string = buildDefaultHeader(),
): Buffer {
  const { vertices, triangles } = mesh;
  const triangleCount = Math.floor(triangles.length / 3);
  const totalSize =
    HEADER_SIZE + TRIANGLE_COUNT_SIZE + triangleCount * TRIANGLE_RECORD_SIZE;
  const buf = Buffer.alloc(totalSize, 0);

  // Header — write ASCII text, padded with zeros already from alloc.
  // Ensure it does not start with "solid" (would confuse format sniffers).
  let safeHeader = header.startsWith('solid') ? 'binary-stl ' + header : header;
  if (safeHeader.length > HEADER_SIZE) {
    console.warn(
      `Binary STL header exceeds 80 bytes (was ${safeHeader.length}); truncating with <truncated> marker.`,
    );
    const TRUNCATED_MARKER = '<truncated>';
    const keepLength = HEADER_SIZE - TRUNCATED_MARKER.length;
    safeHeader = safeHeader.slice(0, keepLength) + TRUNCATED_MARKER;
  }
  const headerBytes = Buffer.from(safeHeader.slice(0, HEADER_SIZE), 'ascii');
  headerBytes.copy(buf, 0);

  // Triangle count at byte 80 (LE uint32).
  if (triangleCount > 0xFFFFFFFF) {
    throw new Error(`Triangle count ${triangleCount} exceeds binary STL uint32 max (4294967295)`);
  }
  buf.writeUInt32LE(triangleCount, HEADER_SIZE);

  // Per-triangle records starting at byte 84.
  let offset = HEADER_SIZE + TRIANGLE_COUNT_SIZE;
  for (let i = 0; i < triangleCount; i++) {
    const i0 = triangles[i * 3];
    const i1 = triangles[i * 3 + 1];
    const i2 = triangles[i * 3 + 2];

    const v0x = vertices[i0 * 3];
    const v0y = vertices[i0 * 3 + 1];
    const v0z = vertices[i0 * 3 + 2];
    const v1x = vertices[i1 * 3];
    const v1y = vertices[i1 * 3 + 1];
    const v1z = vertices[i1 * 3 + 2];
    const v2x = vertices[i2 * 3];
    const v2y = vertices[i2 * 3 + 1];
    const v2z = vertices[i2 * 3 + 2];

    // Normal = (v1 - v0) × (v2 - v0), normalized.
    const ax = v1x - v0x, ay = v1y - v0y, az = v1z - v0z;
    const bx = v2x - v0x, by = v2y - v0y, bz = v2z - v0z;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const nxN = len > 0 ? nx / len : 0;
    const nyN = len > 0 ? ny / len : 0;
    const nzN = len > 0 ? nz / len : 0;

    // Normal (12 bytes).
    buf.writeFloatLE(nxN, offset); offset += 4;
    buf.writeFloatLE(nyN, offset); offset += 4;
    buf.writeFloatLE(nzN, offset); offset += 4;

    // Vertex 0 (12 bytes).
    buf.writeFloatLE(v0x, offset); offset += 4;
    buf.writeFloatLE(v0y, offset); offset += 4;
    buf.writeFloatLE(v0z, offset); offset += 4;

    // Vertex 1 (12 bytes).
    buf.writeFloatLE(v1x, offset); offset += 4;
    buf.writeFloatLE(v1y, offset); offset += 4;
    buf.writeFloatLE(v1z, offset); offset += 4;

    // Vertex 2 (12 bytes).
    buf.writeFloatLE(v2x, offset); offset += 4;
    buf.writeFloatLE(v2y, offset); offset += 4;
    buf.writeFloatLE(v2z, offset); offset += 4;

    // Attribute byte count (2 bytes, always 0).
    buf.writeUInt16LE(0, offset); offset += 2;
  }

  return buf;
}
