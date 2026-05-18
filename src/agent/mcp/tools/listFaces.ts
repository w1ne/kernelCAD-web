// src/mcp/tools/listFaces.ts
//
// MCP tool: list faces of a kernelCAD shape with optional FaceQuery filter.

import { RecomputeEngine } from '../../../modeling/compute/recomputeEngine';
import { createOcctLowerer } from '../../../modeling/backends/occt/occtLowerer';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { resolveFaceQuery, type FaceQuery } from '../../../kernel/backends/occt/edgeQueries';
import type { Face } from 'replicad';
import { runMcpScript } from '../runMcpScript';
import { defineMCPTool } from '../defineMCPTool';

export interface ListFacesInput {
  file?: string;
  code?: string;
  feature_id?: string;
  query?: FaceQuery;
}

export interface FaceSummary {
  id: string;
  centroid: [number, number, number];
  normal: [number, number, number];
  surfaceType: string;
  area: number;
  label: string | null;
}

export interface ListFacesOutput {
  ok: boolean;
  faces?: FaceSummary[];
  error?: string;
  /** Structured diagnostic code on `ok=false`. Set on both failure paths:
   *  (1) script-runtime exception → `KernelError` code or
   *  `cli.script-exception` for non-kernel throws; (2) lowering-error path →
   *  the first error diagnostic's `code`. */
  errorCode?: string;
}

export async function listFacesTool(input: ListFacesInput): Promise<ListFacesOutput> {
  const script = await runMcpScript(input);
  if (!script.ok) return script;
  const { run } = script;
  if (run.records.length === 0) {
    return { ok: false, error: 'Script returned no features.' };
  }

  const engine = new RecomputeEngine(createOcctLowerer(run.session));
  const r = await engine.run(run.records, { paramTable: run.paramTable });

  const targetId = input.feature_id ?? run.records[run.records.length - 1].id;
  const shape = r.shapes.get(targetId);
  if (!shape) {
    const fatal = r.diagnostics.find(d => d.featureId === targetId && d.severity === 'error');
    return {
      ok: false,
      error: fatal
        ? `Feature '${targetId}' has no lowered shape: ${fatal.message}`
        : `Feature '${targetId}' has no lowered shape.`,
      errorCode: fatal?.code,
    };
  }
  if (!(shape instanceof OcctBackend)) {
    return { ok: false, error: 'Shape is not an OcctBackend.' };
  }

  const matchedFaces = resolveFaceQuery(shape, input.query ?? {});
  const allFaces = (shape.getReplicadShape() as unknown as { faces: Face[] }).faces;

  const faces: FaceSummary[] = matchedFaces.map(f => {
    const idx = allFaces.indexOf(f);
    const c = f.center;
    const n = f.normalAt();
    return {
      id: `f${idx}`,
      centroid: [c.x, c.y, c.z],
      normal: [n.x, n.y, n.z],
      surfaceType: (f as unknown as { geomType?: string }).geomType ?? 'UNKNOWN',
      area: (f as unknown as { area?: number }).area ?? 0,
      label: null,
    };
  });

  return { ok: true, faces };
}

export const listFacesMcpTool = defineMCPTool<ListFacesInput>({
  name: 'list_faces',
  description:
    'List faces of a kernelCAD shape with optional FaceQuery filter. Returns each face\'s id, centroid, normal, surfaceType, area, and label. Use for face introspection before shell/face references. Pass either { file } or { code }; query is an optional FaceQuery object.',
  inputSchema: {
    type: 'object',
    properties: {
      file: { type: 'string', description: 'Path to a .kcad.ts script file.' },
      code: { type: 'string', description: 'Inline kernelCAD script source.' },
      feature_id: { type: 'string', description: 'Optional FeatureId to inspect; defaults to last returned shape.' },
      query: { type: 'object', description: 'Optional FaceQuery filter (atZ, parallelTo, ofSurfaceType, etc).' },
    },
  },
  handler: listFacesTool,
});
