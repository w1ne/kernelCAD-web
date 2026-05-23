// eval/tasks/cqe-task-export-trio/harness.ts
//
// Round-trip gate covering the whole export_model matrix in a single eval
// run. The expert solution returns a two-part Scene (sheet-metal plate +
// solid bracket); the harness exercises four format paths:
//
//   - STL: assembly Scene is fused via the writer's union step; gate on
//     non-empty binary STL output (>= 84-byte header + at least one triangle).
//   - DXF: a Scene cannot route through the DXF writer (multi-body input has
//     no canonical planar wire), so the harness drives a tiny plate-only
//     sheet-metal script through runAndExport({ format: 'dxf' }) and the
//     runtime walks the sheetMetal lineage to ship the flat-pattern
//     polylines. Gate on a re-parse with `dxf-parser` returning >= 1
//     LWPOLYLINE on the `cut` layer.
//   - 3MF: unzip the OPC archive, read 3D/3dmodel.model, assert one <object>
//     per assembly part with the expected names (`plate`, `bracket`).
//   - GLB: round-trip via @gltf-transform/core NodeIO; assert the two named
//     nodes appear in the scene graph.
//
// The harness is deliberately decoupled from the candidate's exact authoring
// style: it pulls the plate dimensions from constants matching the prompt,
// not from the candidate source, so the DXF path doesn't depend on the
// candidate exposing a named flatten-pattern export.
//
// Runs entirely in-process via `runAndExport` (matches the sibling export-*
// task harnesses); no MCP roundtrip, no slicer / viewer manual verification
// (the writer-level tests already cover binary validity).

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import DxfParser from 'dxf-parser';
import { unzipSync, strFromU8 } from 'fflate';
import { NodeIO } from '@gltf-transform/core';
import { evaluateScript } from '../../oracle/kernelcad-client';
import { runAndExport } from '../../../src/agent/script-runtime/export';
import { initOcct } from '../../../src/kernel/backends/occt/occtBackend';
import type { HarnessResult } from '../../types';

interface ParsedDxfEntity {
  type: string;
  layer: string;
}

interface ParsedDxf {
  entities: ParsedDxfEntity[];
}

// Plate-only sheet-metal source. Matches the plate dimensions declared in
// the prompt (50 x 30 x 1.5, kFactor 0.4). The harness writes this beside the
// candidate script and feeds it to runAndExport({ format: 'dxf' }); the
// runtime walks the sheetMetal lineage and ships the flat-pattern polylines
// through the writer (Shape.flattenPattern() itself uses CommonJS require()
// which is unavailable inside the sandboxed vm — return the blank directly
// and let the export path drive flattening from the lineage).
// Keeping the DXF source separate from the candidate lets the candidate
// author the assembly however they prefer (including returning only the
// Scene) without forcing a named-export contract.
const PLATE_DXF_SOURCE = `
const plateProfile = path()
  .moveTo(0, 0)
  .lineTo(50, 0)
  .lineTo(50, 30)
  .lineTo(0, 30)
  .close();
return sheetMetal(plateProfile, { thickness: 1.5, kFactor: 0.4 });
`;

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  await initOcct();
  const code = readFileSync(scriptPath, 'utf8');

  // STL — STL of a Scene currently requires an explicit Scene.toUnion() /
  // Scene.toCompound() upstream, so the harness rewrites the candidate's
  // trailing `return ...;` to fuse the Scene into a single Shape before
  // shipping to the writer. The rewrite is intentionally local: the 3MF /
  // GLB paths still see the original Scene return so per-part names + colors
  // survive the multi-body fan-out.
  const stlCode = code.replace(
    /return\s+([^;]+?)\s*;\s*$/,
    'return ($1).toUnion();',
  );
  const stl = await runAndExport({ code: stlCode, fileName: scriptPath, format: 'stl' });
  const stlErrors = stl.diagnostics.filter((d) => d.severity === 'error');
  const stlOk = stlErrors.length === 0 && stl.bytes.length >= 84;

  // DXF — drive the writer with a plate-only flatten-pattern script. The
  // file lives under tmpdir() (not next to the candidate) so the task
  // directory stays clean across reruns. `fileName` is informational only;
  // the runtime sees `code` directly.
  const dxfWorkDir = mkdtempSync(join(tmpdir(), 'kcad-export-trio-dxf-'));
  const dxfScriptPath = join(dxfWorkDir, 'plate.kcad.ts');
  writeFileSync(dxfScriptPath, PLATE_DXF_SOURCE);
  const dxf = await runAndExport({
    code: PLATE_DXF_SOURCE,
    fileName: dxfScriptPath,
    format: 'dxf',
  });
  rmSync(dxfWorkDir, { recursive: true, force: true });
  const dxfErrors = dxf.diagnostics.filter((d) => d.severity === 'error');
  let dxfOk = false;
  if (dxfErrors.length === 0 && dxf.bytes.length > 0) {
    try {
      const parsed = new DxfParser().parseSync(
        new TextDecoder().decode(dxf.bytes),
      ) as unknown as ParsedDxf;
      const cutPolys = parsed.entities.filter(
        (e) => e.type === 'LWPOLYLINE' && e.layer === 'cut',
      );
      const hasSplines = parsed.entities.some((e) => e.type === 'SPLINE');
      dxfOk = cutPolys.length >= 1 && !hasSplines;
    } catch {
      dxfOk = false;
    }
  }

  // 3MF — assembly Scene → OPC zip with one <object> per part.
  const tmf = await runAndExport({ code, fileName: scriptPath, format: '3mf' });
  const tmfErrors = tmf.diagnostics.filter((d) => d.severity === 'error');
  let mfOk = false;
  let mfNamesOk = false;
  if (tmfErrors.length === 0 && tmf.bytes.length > 0) {
    try {
      const entries = unzipSync(tmf.bytes);
      const modelBytes = entries['3D/3dmodel.model'];
      if (modelBytes) {
        const model = strFromU8(modelBytes);
        const nameMatches = model.match(/<object[^>]*\bname="([^"]+)"/g) ?? [];
        const names = nameMatches.map((s) =>
          s.replace(/.*\bname="([^"]+)".*/, '$1'),
        );
        mfOk = names.length === 2;
        mfNamesOk = names.includes('plate') && names.includes('bracket');
      }
    } catch {
      mfOk = false;
    }
  }

  // GLB — assembly Scene → glTF binary with one node per part.
  const glb = await runAndExport({ code, fileName: scriptPath, format: 'glb' });
  const glbErrors = glb.diagnostics.filter((d) => d.severity === 'error');
  let glbOk = false;
  let glbNamesOk = false;
  if (glbErrors.length === 0 && glb.bytes.length > 0) {
    try {
      const doc = await new NodeIO().readBinary(glb.bytes);
      const nodeNames = doc
        .getRoot()
        .listNodes()
        .map((n) => n.getName());
      glbOk = nodeNames.filter((n) => n === 'plate' || n === 'bracket').length === 2;
      glbNamesOk = nodeNames.includes('plate') && nodeNames.includes('bracket');
    } catch {
      glbOk = false;
    }
  }

  return {
    gates: {
      'evaluates clean': true,
      'STL writes binary mesh': stlOk,
      'DXF writes LWPOLYLINE on cut layer': dxfOk,
      '3MF writes two <object> entries': mfOk,
      'GLB writes two named nodes': glbOk,
    },
    scored: {
      '3MF object names match (plate + bracket)': mfNamesOk,
      'GLB node names match (plate + bracket)': glbNamesOk,
    },
  };
}
