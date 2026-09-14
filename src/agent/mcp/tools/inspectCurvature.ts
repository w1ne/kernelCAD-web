// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Reader for inspect({ of: 'curvature' }).
import type { Face } from 'replicad';
import { inspectCurvature } from '../../../kernel/backends/occt/surfaceQuality';
import { resolveFaceQuery, type FaceQuery } from '../../../kernel/backends/occt/edgeQueries';
import { formatTopoRef } from '../../../kernel/naming';
import { withNextActions } from '../../../shared/diagnostics/diagnostic';
import type { CompilerDiagnostic } from '../../../shared/diagnostics/diagnostic';
import { HINT_TEMPLATES } from '../../../shared/diagnostics/registry';
import { loadInspectOcctShape, type InspectShapeInput } from './inspectShapeLoad';
import type { Vec3 } from '../../../shared/intent/types';

export interface InspectCurvatureInput extends InspectShapeInput {
  /** FaceQuery, a single @kc[...] ref, or an array of refs. Omit to sample every face. */
  faces?: FaceQuery | string | string[];
  /** Spike sensitivity as a multiple of the face's Gaussian stddev (default 6). */
  spike_factor?: number;
}

export interface FaceCurvatureReport {
  ref: string;
  id: string;
  surfaceType: string;
  gaussian: { min: number; max: number; mean: number };
  mean: { min: number; max: number; mean: number };
  inflections: number;
  spikes: Array<{ point: Vec3; gaussian: number; mean: number }>;
  sampleCount: number;
}

export interface InspectCurvatureOutput {
  ok: boolean;
  faces?: FaceCurvatureReport[];
  diagnostics?: CompilerDiagnostic[];
  error?: string;
  errorCode?: string;
}

function asFaceQuery(faces: InspectCurvatureInput['faces']): FaceQuery | undefined {
  if (faces === undefined) return undefined;
  if (typeof faces === 'string' || Array.isArray(faces)) return undefined;
  return faces;
}

function asRefs(faces: InspectCurvatureInput['faces']): string[] | undefined {
  if (typeof faces === 'string') return [faces];
  if (Array.isArray(faces) && faces.every(f => typeof f === 'string')) return faces;
  return undefined;
}

function faceHashOf(face: Face): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrapped = (face as any).wrapped ?? (face as any)._wrapped ?? face;
  return (wrapped as { HashCode: (n: number) => number }).HashCode(2147483647).toString(16);
}

export async function inspectCurvatureTool(input: InspectCurvatureInput): Promise<InspectCurvatureOutput> {
  const loaded = await loadInspectOcctShape(input);
  if (!loaded.ok) return loaded;
  const { shape, owner } = loaded;

  const query = asFaceQuery(input.faces);
  const refs = asRefs(input.faces);
  const matched = query !== undefined ? resolveFaceQuery(shape, query) : undefined;
  const matchedHashes = matched !== undefined ? new Set(matched.map(faceHashOf)) : undefined;

  const sampled = inspectCurvature(
    shape,
    (face: Face, index: number) => {
      if (matchedHashes !== undefined) return matchedHashes.has(faceHashOf(face));
      if (refs !== undefined) {
        const id = `f${index}`;
        const ref = formatTopoRef({ owner, kind: 'face', segments: [id] });
        return refs.includes(ref) || refs.includes(id);
      }
      return true;
    },
    input.spike_factor,
  );

  const faces: FaceCurvatureReport[] = sampled.map(s => ({
    ref: formatTopoRef({ owner, kind: 'face', segments: [`f${s.faceIndex}`] }),
    id: `f${s.faceIndex}`,
    surfaceType: s.surfaceType,
    gaussian: s.gaussian,
    mean: s.mean,
    inflections: s.inflections,
    spikes: s.spikes,
    sampleCount: s.sampleCount,
  }));

  const diagnostics: CompilerDiagnostic[] = [];
  const spiked = faces.filter(f => f.spikes.length > 0);
  if (spiked.length > 0) {
    const hit = spiked.reduce((a, b) => (a.spikes.length >= b.spikes.length ? a : b));
    const peak = hit.spikes.reduce((a, b) => (Math.abs(a.gaussian) >= Math.abs(b.gaussian) ? a : b));
    diagnostics.push({
      target: 'export-occt',
      code: 'inspect.curvature.spike',
      severity: 'warn',
      message:
        `${spiked.length} face(s) have curvature spikes. Peak |K|=${Math.abs(peak.gaussian).toExponential(2)} ` +
        `on ${hit.ref} at [${peak.point.map(n => n.toFixed(2)).join(', ')}].`,
      hint: HINT_TEMPLATES['inspect.curvature.spike'].template,
    });
  }

  return { ok: true, faces, diagnostics: withNextActions(diagnostics) };
}
