// src/mcp/tools/evaluateSdf.ts
//
// Read-only MCP tool: sample the signed distance from an in-script
// sdf.* field at a 3D point. Used by agents to verify SDF composition
// before calling the (expensive) sdf.materialize.
//
// Implementation contract (slice 1):
//   1. Re-run the supplied script via runMcpScript (same isolation as
//      get_shape_info).
//   2. The script must register the field on the session via
//      `sdf.bind(name, field)` (the global-this approach the original plan
//      proposed isn't viable — the script sandbox in
//      `src/script-runtime/isolation.ts` strips `globalThis`).
//   3. Look up `session.sdfFields.get(fieldName)`. Validate it has the
//      SdfField shape (callable + `.aabb` + `.kind`).
//   4. Sample the field at the point. Return `{ distance, inside, aabb, kind }`.

import { runMcpScript } from '../runMcpScript';
import type { Vec3 } from '../../shared/intent/types';

export interface EvaluateSdfInput {
  file?: string;
  code?: string;
  fieldName: string;
  point: [number, number, number];
}

export type EvaluateSdfOutput =
  | {
      ok: true;
      distance: number;
      inside: boolean;
      aabb: { min: Vec3; max: Vec3 };
      kind: string;
    }
  | {
      ok: false;
      errorCode: 'feature.invalid-args' | 'feature.sdf.field-undefined' | 'cli.script-exception';
      error: string;
      hint: string;
    };

function isPointValid(p: unknown): p is [number, number, number] {
  return Array.isArray(p) && p.length === 3
    && p.every(c => typeof c === 'number' && Number.isFinite(c));
}

function isSdfFieldLike(v: unknown): v is {
  (p: Vec3): number;
  aabb: { min: Vec3; max: Vec3 };
  kind: string;
} {
  if (typeof v !== 'function') return false;
  const o = v as { aabb?: unknown; kind?: unknown };
  if (typeof o.kind !== 'string') return false;
  if (typeof o.aabb !== 'object' || o.aabb === null) return false;
  const a = o.aabb as { min?: unknown; max?: unknown };
  return Array.isArray(a.min) && a.min.length === 3
    && Array.isArray(a.max) && a.max.length === 3;
}

export async function evaluateSdfTool(input: EvaluateSdfInput): Promise<EvaluateSdfOutput> {
  if (!isPointValid(input.point)) {
    return {
      ok: false,
      errorCode: 'feature.invalid-args',
      error: `evaluate_sdf: point must be a 3-tuple of finite numbers; got ${JSON.stringify(input.point)}.`,
      hint: 'invalid-args.evaluate_sdf.point — pass a [x, y, z] tuple of finite numbers.',
    };
  }
  if (typeof input.fieldName !== 'string' || input.fieldName.length === 0) {
    return {
      ok: false,
      errorCode: 'feature.invalid-args',
      error: 'evaluate_sdf: fieldName must be a non-empty string.',
      hint: 'invalid-args.evaluate_sdf.fieldName — the script must bind the SdfField via sdf.bind(name, field); pass that name.',
    };
  }

  const script = await runMcpScript({ file: input.file, code: input.code });
  if (!script.ok) {
    return {
      ok: false,
      errorCode: 'cli.script-exception',
      error: script.error ?? 'script failed',
      hint: 'cli.script-exception — fix the script syntax or runtime error and retry.',
    };
  }

  const field = script.run.session.sdfFields.get(input.fieldName);
  if (field === undefined) {
    return {
      ok: false,
      errorCode: 'feature.sdf.field-undefined',
      error: `evaluate_sdf: no SdfField bound under name '${input.fieldName}' in the script's session.`,
      hint: "sdf.field-undefined — the script must call `sdf.bind('<name>', field)` before returning. Available names: " +
        (script.run.session.sdfFields.size > 0
          ? Array.from(script.run.session.sdfFields.keys()).join(', ')
          : '(none)'),
    };
  }
  if (!isSdfFieldLike(field)) {
    return {
      ok: false,
      errorCode: 'feature.sdf.field-undefined',
      error: `evaluate_sdf: binding '${input.fieldName}' is not an SdfField (no callable + aabb + kind).`,
      hint: "sdf.field-undefined — sdf.bind expects an SdfField produced by sdf.sphere/.box/.cylinder/.torus/.smoothBlend.",
    };
  }

  let distance: number;
  try {
    distance = field(input.point);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      errorCode: 'feature.sdf.field-undefined',
      error: `evaluate_sdf: field threw at point ${JSON.stringify(input.point)}: ${msg}`,
      hint: 'sdf.field-undefined — the SDF evaluator threw. Check smoothBlend k > 0 and avoid divide-by-zero in custom fields.',
    };
  }
  if (!Number.isFinite(distance)) {
    return {
      ok: false,
      errorCode: 'feature.sdf.field-undefined',
      error: `evaluate_sdf: field returned non-finite (${distance}) at point ${JSON.stringify(input.point)}.`,
      hint: 'sdf.field-undefined — the SDF returned NaN/Infinity. Check field composition.',
    };
  }
  return {
    ok: true,
    distance,
    inside: distance < 0,
    aabb: field.aabb,
    kind: field.kind,
  };
}
