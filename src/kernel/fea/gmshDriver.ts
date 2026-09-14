// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/fea/gmshDriver.ts
//
// Meshing stage: BREP -> quadratic tetrahedra, via the gmsh Python API.
//
// The driver script is embedded as a string and written into the job's temp
// directory at run time. Deliberate: a .py sitting in src/ would have to be
// copied by the TypeScript build and by the npm `files` list to survive
// packaging, and a missing data file would surface as a confusing "gmsh
// failed" rather than as anything diagnosable. One source file, no build step.
//
// What the driver hands back is more than a mesh:
//   - Every SURFACE's centre of mass and area. That is what lets the runner
//     bind a kernelCAD face query to a gmsh surface without inventing a
//     geometry-entity naming convention, and it is what turns a node-level stress
//     peak into a NAMED region an agent can act on.
//   - Element quality (`minSICN`). A stress answer off a degenerate mesh is
//     worse than no answer, so the trust flag is computed from real numbers
//     rather than assumed.

import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runBounded } from './toolchain';
import type { FeaMesh, FeaSurface, FeaTet10 } from './types';

/** Tets below this signed-inverse-condition-number are counted as poor. */
export const LOW_QUALITY_SICN = 0.1;

const DRIVER_PY = String.raw`
import json, sys
import gmsh

geometry_path, out_path, mesh_size, min_size = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])

gmsh.initialize()
try:
    gmsh.option.setNumber("General.Terminal", 0)
    gmsh.model.add("kernelcad")
    gmsh.model.occ.importShapes(geometry_path)
    gmsh.model.occ.synchronize()

    volumes = gmsh.model.getEntities(3)
    if len(volumes) == 0:
        raise RuntimeError("the geometry file carries no solid volume to mesh")

    surface_info = []
    for (dim, tag) in gmsh.model.getEntities(2):
        com = gmsh.model.occ.getCenterOfMass(dim, tag)
        area = gmsh.model.occ.getMass(dim, tag)
        surface_info.append((int(tag), [float(c) for c in com], float(area)))

    gmsh.option.setNumber("Mesh.MeshSizeMax", mesh_size)
    gmsh.option.setNumber("Mesh.MeshSizeMin", min_size)
    gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
    gmsh.option.setNumber("Mesh.ElementOrder", 2)
    gmsh.option.setNumber("Mesh.SecondOrderIncomplete", 0)
    gmsh.option.setNumber("Mesh.Optimize", 1)
    gmsh.option.setNumber("Mesh.OptimizeNetgen", 0)
    gmsh.model.mesh.generate(3)

    node_tags, coords, _ = gmsh.model.mesh.getNodes()
    nodes = []
    for i, t in enumerate(node_tags):
        nodes.append([int(t), float(coords[3 * i]), float(coords[3 * i + 1]), float(coords[3 * i + 2])])

    elements = []
    for etype, etags, enodes in zip(*gmsh.model.mesh.getElements(3)):
        if etype != 11:  # 10-node tetrahedron
            continue
        for i, t in enumerate(etags):
            elements.append([int(t)] + [int(x) for x in enodes[10 * i:10 * i + 10]])
    if len(elements) == 0:
        raise RuntimeError("gmsh produced no 10-node tetrahedra")

    qualities = gmsh.model.mesh.getElementQualities([e[0] for e in elements], "minSICN")
    qualities = [float(q) for q in qualities]

    surfaces = []
    for (tag, com, area) in surface_info:
        stags, _, _ = gmsh.model.mesh.getNodes(2, tag, includeBoundary=True)
        tris = []
        for etype, etags, enodes in zip(*gmsh.model.mesh.getElements(2, tag)):
            # 2 = linear triangle, 9 = 6-node quadratic triangle. Either way
            # the first three entries are the corner nodes, which is all the
            # heatmap surface needs.
            stride = {2: 3, 9: 6}.get(etype)
            if stride is None:
                continue
            for i in range(len(etags)):
                base = stride * i
                tris.append([int(enodes[base]), int(enodes[base + 1]), int(enodes[base + 2])])
        surfaces.append({
            "tag": tag,
            "centroid": com,
            "area": area,
            "nodes": sorted(int(x) for x in stags),
            "tris": tris,
        })

    low = float(sys.argv[5])
    payload = {
        "nodes": nodes,
        "elements": elements,
        "surfaces": surfaces,
        "quality": {
            "minSICN": min(qualities),
            "meanSICN": sum(qualities) / len(qualities),
            "lowQualityCount": sum(1 for q in qualities if q < low),
            "lowQualityThreshold": low,
        },
        "meshSize": mesh_size,
        "volumeCount": len(volumes),
    }
    with open(out_path, "w") as fh:
        json.dump(payload, fh)
finally:
    gmsh.finalize()
`;

export interface MeshStepOpts {
  python: string;
  /** OCCT BREP (or STEP) file gmsh's OCC kernel imports. */
  geometryPath: string;
  jobDir: string;
  /** Target element size in mm. */
  meshSize: number;
  timeoutMs: number;
}

export interface MeshStepResult {
  mesh: FeaMesh;
  volumeCount: number;
  meshMs: number;
}

interface RawMesh {
  nodes: [number, number, number, number][];
  elements: number[][];
  surfaces: Array<{
    tag: number;
    centroid: [number, number, number];
    area: number;
    nodes: number[];
    tris: [number, number, number][];
  }>;
  quality: { minSICN: number; meanSICN: number; lowQualityCount: number; lowQualityThreshold: number };
  meshSize: number;
  volumeCount: number;
}

/**
 * Mesh a B-rep file into quadratic tets. Throws with the gmsh stderr attached
 * on failure — the driver's own messages ("no solid volume to mesh") are more
 * useful to an agent than a generic exit code.
 */
export async function meshStep(opts: MeshStepOpts): Promise<MeshStepResult> {
  const scriptPath = join(opts.jobDir, 'mesh_driver.py');
  const outPath = join(opts.jobDir, 'mesh.json');
  await writeFile(scriptPath, DRIVER_PY, 'utf8');

  const minSize = Math.max(opts.meshSize / 4, 1e-3);
  const started = Date.now();
  const r = await runBounded(
    opts.python,
    [scriptPath, opts.geometryPath, outPath, String(opts.meshSize), String(minSize), String(LOW_QUALITY_SICN)],
    { cwd: opts.jobDir, timeoutMs: opts.timeoutMs },
  );
  const meshMs = Date.now() - started;
  if (r.timedOut) {
    throw new Error(
      `gmsh exceeded the ${opts.timeoutMs} ms mesh budget at meshSize=${opts.meshSize} mm. Raise meshSize on the study, or raise the timeout.`,
    );
  }
  if (r.code !== 0) {
    throw new Error(`gmsh failed (exit ${r.code}): ${r.out.trim().split('\n').slice(-6).join(' | ')}`);
  }

  const raw = JSON.parse(await readFile(outPath, 'utf8')) as RawMesh;
  const nodes = new Map<number, readonly [number, number, number]>();
  for (const [id, x, y, z] of raw.nodes) nodes.set(id, [x, y, z]);
  const elements: FeaTet10[] = raw.elements.map(e => ({ id: e[0], nodes: e.slice(1) }));
  const surfaces: FeaSurface[] = raw.surfaces.map(s => ({
    tag: s.tag,
    centroid: s.centroid,
    area: s.area,
    nodes: s.nodes,
    tris: s.tris ?? [],
  }));
  return {
    mesh: { nodes, elements, surfaces, quality: raw.quality, meshSize: raw.meshSize },
    volumeCount: raw.volumeCount,
    meshMs,
  };
}
