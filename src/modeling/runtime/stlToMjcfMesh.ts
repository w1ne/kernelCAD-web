// src/modeling/runtime/stlToMjcfMesh.ts
//
// Binary STL → MJCF `<mesh vertex="...">` formatter for the P11 collision-
// aware MuJoCo gate. Parses the binary STL record stream that
// `OcctBackend.exportSTLAsync()` produces, deduplicates vertices, and
// emits the space-separated `x y z x y z ...` string MJCF accepts inline
// inside `<asset><mesh vertex="..."/>`.
//
// Why inline rather than FS-mounted STL files: MuJoCo's wasm runtime can
// read meshes off Emscripten's virtual FS, but it adds a sync FS-write
// step on every `validate` invocation. Kinematic-part meshes are small
// (the Luxo lamp tops out at ~1k triangles per part); a 7-part assembly
// inlines to ~150 KB of XML — fine for the gate, no temp-file lifecycle
// to manage.
//
// Spec:  docs/specs/2026-06-03-physics-loop-P11-collision-aware-mujoco.md
// Plan:  docs/plans/2026-06-03-physics-loop-P11-slice-1-collision-geom-emission.md

const HEADER_SIZE = 80;
const TRIANGLE_COUNT_SIZE = 4;
const TRIANGLE_RECORD_SIZE = 50; // 12 (normal) + 36 (3 vertices) + 2 (attribute)

export interface MjcfMeshData {
    /** Space-separated triplets, mm. Order: `v1x v1y v1z v2x v2y v2z ...`. */
    readonly vertex: string;
    /** Triangle count (matches the binary-STL header field). */
    readonly triangleCount: number;
    /** Unique vertex count after dedup. */
    readonly vertexCount: number;
}

/**
 * Parse a binary STL byte array into a deduplicated vertex list and
 * format it as MJCF's `<mesh vertex="...">` attribute string.
 *
 * - Normals are skipped; MuJoCo recomputes them per face at compile time.
 * - Vertices are deduplicated via a quantised-key map so a watertight
 *   cube (12 triangles, 36 raw vertex records) collapses to 8 unique
 *   `<mesh>` vertices. Dedup cuts XML size ~3× on typical OCCT export
 *   tessellations.
 * - Coordinate values stay in millimetres. `mjcfExport.ts` emits the
 *   `<mesh>` with `scale="0.001 0.001 0.001"` so MuJoCo rescales the
 *   vertex stream into its metre world at compile time — matching the
 *   mm→m conversion already applied to body `pos` / `<inertial>`.
 *
 * Throws if the input is shorter than the binary-STL header or if the
 * declared triangle count would overrun the buffer — both are
 * serializer bugs upstream, not user-visible errors. Empty meshes
 * (`triangleCount === 0`) also throw: a part with no collision geometry
 * cannot participate in MuJoCo contact resolution.
 */
export function stlToMjcfMesh(stlBytes: Uint8Array): MjcfMeshData {
    if (stlBytes.byteLength < HEADER_SIZE + TRIANGLE_COUNT_SIZE) {
        throw new Error(
            `stlToMjcfMesh: input too short (${stlBytes.byteLength} bytes) — expected at least ${HEADER_SIZE + TRIANGLE_COUNT_SIZE} for the binary-STL header.`,
        );
    }
    const view = new DataView(
        stlBytes.buffer,
        stlBytes.byteOffset,
        stlBytes.byteLength,
    );
    const triangleCount = view.getUint32(HEADER_SIZE, true);
    const expectedSize =
        HEADER_SIZE + TRIANGLE_COUNT_SIZE + triangleCount * TRIANGLE_RECORD_SIZE;
    if (stlBytes.byteLength < expectedSize) {
        throw new Error(
            `stlToMjcfMesh: declared triangle count ${triangleCount} would require ${expectedSize} bytes, but input is only ${stlBytes.byteLength}.`,
        );
    }
    if (triangleCount === 0) {
        throw new Error(
            'stlToMjcfMesh: STL has zero triangles — a part with no collision geometry cannot participate in MuJoCo contact resolution.',
        );
    }

    // Dedup vertices via a quantised key. OCCT's binary STL records each
    // triangle's three vertices independently, so a watertight mesh has
    // 3× duplication. The quantisation (1e-4 mm) is well below
    // export-STL tessellation noise but tight enough to keep adjacent
    // faces sharing one vertex.
    const uniqueCoords: number[] = []; // flat x,y,z,x,y,z,...
    const indexByKey = new Map<string, number>();
    function intern(x: number, y: number, z: number): void {
        const key = `${x.toFixed(4)} ${y.toFixed(4)} ${z.toFixed(4)}`;
        if (!indexByKey.has(key)) {
            indexByKey.set(key, uniqueCoords.length / 3);
            uniqueCoords.push(x, y, z);
        }
    }

    let offset = HEADER_SIZE + TRIANGLE_COUNT_SIZE;
    for (let i = 0; i < triangleCount; i++) {
        // Skip the 12-byte normal — MuJoCo recomputes it.
        offset += 12;
        for (let v = 0; v < 3; v++) {
            const x = view.getFloat32(offset, true);
            const y = view.getFloat32(offset + 4, true);
            const z = view.getFloat32(offset + 8, true);
            intern(x, y, z);
            offset += 12;
        }
        // Skip the 2-byte attribute trailer.
        offset += 2;
    }

    // Emit the MJCF vertex string. `.toFixed(4)` keeps the XML deterministic
    // (snapshot-stable) and matches the dedup-key precision.
    const parts: string[] = [];
    for (let i = 0; i < uniqueCoords.length; i++) {
        parts.push(uniqueCoords[i].toFixed(4));
    }
    return {
        vertex: parts.join(' '),
        triangleCount,
        vertexCount: uniqueCoords.length / 3,
    };
}
