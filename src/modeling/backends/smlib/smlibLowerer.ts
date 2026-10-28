// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { FeatureLowerer, LowerResult, ResolvedInputs, ShapeBackend } from '../../../kernel/backends/backend';
import { importStepShape } from '../../../kernel/import/inspectStep';
import { OcctBackend } from '../../../kernel/backends/occt/occtBackend';
import { pickEdges, pickFace } from '../../../kernel/backends/occt/edgeSelection';
import { createOcctLowerer } from '../occt/occtLowerer';
import type { LowererSession } from '../kernelRegistry';
import type { FeatureRecord } from '../../../shared/intent/featureRecord';
import type { SketchCommand } from '../../../shared/capture/sketchCommand';
import { withNextAction } from '../../../shared/diagnostics/diagnostic';
import { cutNoOp, GuardError, measureCrossCheck, repairInvariant, requireSimpleProfile, type Measures, type Point2 } from './guards';
import { loadSmlib, takeSmlibWarnings } from './runtime';
import { preserveProvenance } from './provenance';
import type { Part, Edge, Face, Shell } from '@classcad/smlibwasm';

type Smlib = typeof import('@classcad/smlibwasm');
export interface KernelGuardRecord { featureId: string; outcome: 'accepted' | 'fallback'; guard?: string; message?: string }
const measures = (shape: ShapeBackend): Measures => ({ volume: shape.volume(), area: shape.surfaceArea() });
const nativeMeasures = (part: Part): Measures => {
  const p = part.massProperties(1, 1e-8);
  return { volume: p.volume, area: p.area };
};
// Kinds for which lower() currently reaches a native SMLib build attempt.
// Other kinds deliberately use the OCCT reference without a native attempt.
const NATIVE_ATTEMPT_KINDS = ['box', 'cylinder', 'sphere', 'extrude', 'boolean', 'fillet', 'moveFaces', 'offsetFaces', 'importedStep'] as const;

/** Experimental hybrid lowerer. Native candidates are checked against a full
 * OCCT reference, then returned as OCCT-compatible shapes for existing naming,
 * synchronous operations and exporters. No speed advantage is claimed. */
export class SmlibLowerer implements FeatureLowerer {
  readonly target = 'export-smlib' as const;
  private readonly reference;
  readonly supports;
  readonly guardRecords: KernelGuardRecord[] = [];
  constructor(session?: LowererSession) {
    this.reference = createOcctLowerer(session);
    this.supports = new Set(NATIVE_ATTEMPT_KINDS);
  }

  /** OCCT must have produced a solid this lowerer knows how to attempt. */
  private assertNativeAttempt(record: FeatureRecord, reference: LowerResult): void {
    if (reference.diagnostics.some((d) => d.severity === 'error') || !reference.shape) {
      throw new GuardError('OCCT_REFERENCE_FAILED', 'OCCT reference did not produce an acceptable result');
    }
    if (!(NATIVE_ATTEMPT_KINDS as readonly string[]).includes(record.kind)) {
      throw new GuardError('UNSUPPORTED_FEATURE', `Native ${record.kind} is not implemented`);
    }
    if (record.transforms.length) {
      throw new GuardError('UNSUPPORTED_TRANSFORM', 'Post-feature transforms use OCCT');
    }
  }

  async lower(record: FeatureRecord, inputs: ResolvedInputs): Promise<LowerResult> {
    // Build once, preserving OCCT's own diagnostics and result for fallback.
    const reference = await this.reference.lower(record, inputs);
    const owned: Part[] = [];
    const occtOwned: ShapeBackend[] = [];
    let compatibility: OcctBackend | undefined;
    try {
      this.assertNativeAttempt(record, reference);
      this.checkProfile(record, inputs);
      const sm = await loadSmlib();
      takeSmlibWarnings();
      const own = (part: Part | Shell): Part => {
        if (!(part instanceof sm.Part)) { part.dispose(); throw new GuardError('INVALID_CANDIDATE', 'Expected a closed solid'); }
        owned.push(part); return part;
      };
      const read = async (shape: ShapeBackend): Promise<Part> => {
        if (!(shape instanceof OcctBackend)) throw new GuardError('STEP_NORMALIZATION', 'Input is not an OCCT-compatible solid');
        // This is an OCCT re-write even for importedStep: never feed original
        // producer bytes into the SMLib STEP reader.
        const before = measures(shape);
        let normalized: Uint8Array;
        try { normalized = await shape.exportSTEPAsync(); }
        catch (e) { throw new GuardError('STEP_NORMALIZATION', e instanceof Error ? e.message : String(e)); }
        const imported = sm.fromStep(new TextDecoder().decode(normalized));
        const bodies = Array.isArray(imported) ? imported : [imported];
        for (const body of bodies) if (body instanceof sm.Part) own(body);
        if (bodies.length !== 1 || !(bodies[0] instanceof sm.Part)) {
          for (const body of bodies) if (!(body instanceof sm.Part)) body.dispose();
          throw new GuardError('STEP_IMPORT_INVARIANT', 'Expected one closed solid');
        }
        const part = bodies[0];
        // The published importer hides the pre-seam body, so compare the whole
        // import with the normalized OCCT producer at repair tolerance. This
        // conservative check cannot isolate seam repair from reconstruction drift.
        try { repairInvariant(before, nativeMeasures(part)); }
        catch (e) { throw new GuardError('STEP_IMPORT_INVARIANT', e instanceof Error ? e.message : String(e)); }
        return part;
      };
      const candidate = await this.build(sm, record, inputs, reference.shape, read, own, occtOwned);
      if (!candidate.isValid()) throw new GuardError('INVALID_CANDIDATE', 'SMLib topology check failed');
      const deprecated = takeSmlibWarnings();
      if (deprecated.length) throw new GuardError('DEPRECATION', deprecated.join(' '));
      measureCrossCheck(measures(reference.shape), nativeMeasures(candidate));
      compatibility = await importStepShape(new TextEncoder().encode(sm.toStep(candidate)));
      // Export/re-import is a separate guard: healthy native volume does not
      // establish healthy interchange (the prototype showed +0.438% drift).
      measureCrossCheck(measures(reference.shape), measures(compatibility));
      if (!(reference.shape instanceof OcctBackend)) throw new GuardError('NAMING_HISTORY', 'Missing OCCT provenance source');
      compatibility = preserveProvenance(reference.shape, compatibility);
      this.guardRecords.push({ featureId: record.id, outcome: 'accepted' });
      reference.shape.dispose?.();
      return { shape: compatibility, diagnostics: reference.diagnostics };
    } catch (e) {
      compatibility?.dispose();
      const guard = e instanceof GuardError ? e.code : 'KERNEL_EXCEPTION';
      const message = e instanceof Error ? e.message : String(e);
      this.guardRecords.push({ featureId: record.id, outcome: 'fallback', guard, message });
      return {
        shape: reference.shape,
        diagnostics: [...reference.diagnostics, withNextAction({
          target: this.target, featureId: record.id, severity: 'warn',
          code: 'recompute.kernel.guard-fallback',
          message: `SMLib guard ${guard}: ${message}. Using OCCT reference.`,
          hint: "Read the named guard and correct the input, or explicitly select kernel: 'occt'.",
        })],
      };
    } finally {
      for (const part of new Set(owned)) part.dispose();
      for (const shape of occtOwned) shape.dispose?.();
    }
  }

  private checkProfile(record: FeatureRecord, inputs: ResolvedInputs): void {
    if (record.kind !== 'extrude') return;
    if ((record.params.twistAngle?.evaluated ?? 0) !== 0) throw new GuardError('UNSUPPORTED_PROFILE', 'Twisted extrusion uses OCCT');
    const kind = record.params.profileKind.expression.replace(/'/g, '');
    if (kind === 'polygon') requireSimpleProfile(this.polygon(record));
    if (kind === 'sketch') {
      const ref = record.inputs.sketch;
      const sketch = inputs.records?.find(r => ref?.kind === 'feature' && r.id === ref.id);
      if (!sketch || sketch.transforms.length) throw new GuardError('UNSUPPORTED_PROFILE', 'Sketch source or placement unavailable');
      // Supported curves are sampled by the same SMLib edges used to build
      // the candidate below. Unsupported commands fail closed to OCCT.
    }
  }

  private polygon(record: FeatureRecord): Point2[] {
    const raw = record.metadata?.points;
    if (!Array.isArray(raw)) throw new GuardError('BAD_PROFILE', 'Missing polygon points');
    const coord = (v: unknown): number => typeof v === 'number' ? v : (v as {evaluated: number})?.evaluated;
    return raw.map(p => [coord(p[0]), coord(p[1])]);
  }

  private async build(sm: Smlib, r: FeatureRecord, inputs: ResolvedInputs, reference: ShapeBackend,
    read: (shape: ShapeBackend) => Promise<Part>, own: (part: Part | Shell) => Part, occtOwned: ShapeBackend[]): Promise<Part> {
    const p = (name: string) => r.params[name].evaluated;
    if (r.kind === 'box') {
      const part = own(sm.Box(p('x'),p('y'),p('z')));
      return (r.params.centered?.evaluated ?? 0) > .5 ? part : own(part.translate([p('x')/2,p('y')/2,p('z')/2]));
    }
    if (r.kind === 'cylinder') return own(own(sm.Cylinder(p('r'),p('h'))).translate([0,0,p('h')/2]));
    if (r.kind === 'sphere') return own(sm.Sphere(p('r')));
    if (r.kind === 'importedStep') return read(reference);
    if (r.kind === 'extrude') return this.buildExtrude(sm,r,inputs,own);
    const base = inputs.byKey.base;
    if (!base) throw new GuardError('MISSING_INPUT', 'Missing base solid');
    if (r.kind === 'boolean') return this.buildBoolean(r,inputs,base,read,own,occtOwned);
    if (r.kind === 'fillet') return this.buildFillet(r,inputs,base,read,own);
    if (r.kind === 'moveFaces' || r.kind === 'offsetFaces') return this.buildFaceEdit(r, inputs, base, read, own);
    throw new GuardError('UNSUPPORTED_FEATURE', r.kind);
  }

  private buildExtrude(sm: Smlib, r: FeatureRecord, inputs: ResolvedInputs,
    own: (part: Part | Shell) => Part): Part {
    const p = (name: string) => r.params[name].evaluated;
    const kind = r.params.profileKind.expression.replace(/'/g, '');
    if (kind === 'polygon') return own(sm.extrude(sm.Polygon(...this.polygon(r)),p('depth')));
    if (kind === 'rect') return own(sm.extrude(sm.Rectangle(p('w'),p('h')),p('height')));
    if (kind === 'circle') return own(sm.extrude(sm.Circle(p('r')),p('height')));
    if (kind === 'sketch') {
      const ref = r.inputs.sketch;
      const sketch = inputs.records?.find(s => ref?.kind === 'feature' && s.id === ref.id);
      return own(sm.extrude(this.sketch(sm, sketch?.metadata?.commands as SketchCommand[]),p('depth')));
    }
    throw new GuardError('UNSUPPORTED_PROFILE', `Profile ${kind} uses OCCT`);
  }

  private async buildBoolean(r: FeatureRecord, inputs: ResolvedInputs, base: ShapeBackend,
    read: (shape: ShapeBackend) => Promise<Part>, own: (part: Part | Shell) => Part,
    occtOwned: ShapeBackend[]): Promise<Part> {
    let acc = await read(base);
    let occtAcc = base;
    const op = r.params.op.expression.replace(/'/g, '');
    const cutters = Object.entries(inputs.byKey).filter(([k]) => k.startsWith('cutter_')).sort(([a],[b]) => a.localeCompare(b));
    for (const [,tool] of cutters) {
      const nativeTool = await read(tool);
      if (op === 'difference') {
        // Independent OCCT solid intersection certifies material overlap.
        // AABBs and SMLib's own intersection never certify this guard.
        const intersection = occtAcc.intersect(tool);
        let overlap: number;
        try { overlap = intersection.volume(); } finally { intersection.dispose?.(); }
        const next = own(acc.cut(nativeTool));
        cutNoOp(nativeMeasures(acc).volume,nativeMeasures(next).volume,overlap);
        acc = next;
        const nextOcct = occtAcc.subtract(tool);
        occtOwned.push(nextOcct);
        occtAcc = nextOcct;
      } else if (op === 'union') acc = own(acc.fuse(nativeTool));
      else if (op === 'intersection') acc = own(acc.intersect(nativeTool));
      else throw new GuardError('UNSUPPORTED_BOOLEAN', op);
    }
    return acc;
  }

  private async buildFillet(r: FeatureRecord, inputs: ResolvedInputs, base: ShapeBackend,
    read: (shape: ShapeBackend) => Promise<Part>, own: (part: Part | Shell) => Part): Promise<Part> {
    const p = (name: string) => r.params[name].evaluated;
    if (r.metadata?.variable || (r.metadata?.continuity && r.metadata.continuity !== 'G1')) throw new GuardError('UNSUPPORTED_FILLET', 'Variable/G2 fillets use OCCT');
    if (!(base instanceof OcctBackend)) throw new GuardError('UNSUPPORTED_FILLET', 'Missing OCCT selection source');
    const selected = pickEdges(r,base,inputs.records);
    if ('error' in selected) throw new GuardError('EDGE_SELECTION', selected.error.message);
    const part = await read(base);
    const edges = part.edges();
    // Require a unique geometric correspondence, never select by unstable
    // edge index after STEP reconstruction. Ambiguous matches fall back.
    const native: Edge[] = selected.map(edge => {
      const [lo,hi] = edge.boundingBox.bounds;
      const matches = edges.filter(e => {
        const b=e.bbox();
        return [b.min.x,b.min.y,b.min.z,b.max.x,b.max.y,b.max.z].every((v,i) => Math.abs(v-[...lo,...hi][i]) < 1e-5);
      });
      if (matches.length !== 1) throw new GuardError('EDGE_SELECTION', 'No unique STEP edge correspondence');
      return matches[0];
    });
    if (!native.length) throw new GuardError('EDGE_SELECTION', 'Empty fillet selection');
    // 0.6 fillets the whole tangent run unless propagate is false. The OCCT
    // reference rounds only the edges this record selected.
    return own(part.fillet(native, p('radius'), { propagate: false }));
  }

  private async buildFaceEdit(r: FeatureRecord, inputs: ResolvedInputs, base: ShapeBackend,
    read: (shape: ShapeBackend) => Promise<Part>, own: (part: Part | Shell) => Part): Promise<Part> {
    if (!(base instanceof OcctBackend)) throw new GuardError('FACE_SELECTION', 'Missing OCCT selection source');
    const keys = Object.keys(r.inputs).filter((key) => key === 'face' || /^face_\d+$/.test(key))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!keys.length) throw new GuardError('FACE_SELECTION', 'Empty face selection');
    const selected = keys.map((key) => {
      const picked = pickFace({ ...r, inputs: { ...r.inputs, face: r.inputs[key] } }, base, inputs.records);
      if ('error' in picked) throw new GuardError('FACE_SELECTION', picked.error.message);
      return picked;
    });
    const part = await read(base);
    const faces = part.faces();
    const native: Face[] = selected.map((face) => {
      const box = (face as { boundingBox?: { bounds: [[number, number, number], [number, number, number]] } }).boundingBox?.bounds;
      if (!box) throw new GuardError('FACE_SELECTION', 'Selected face has no bounding box');
      const [lo, hi] = box;
      const matches = faces.filter((candidate) => {
        const b = candidate.bbox();
        return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]
          .every((value, index) => Math.abs(value - [...lo, ...hi][index]) < 1e-4);
      });
      if (matches.length !== 1) throw new GuardError('FACE_SELECTION', 'No unique STEP face correspondence');
      return matches[0];
    });
    if (r.kind === 'offsetFaces') return own(part.offsetFaces(native, r.params.distance.evaluated));
    const by: [number, number, number] = [r.params.dx.evaluated, r.params.dy.evaluated, r.params.dz.evaluated];
    return own(part.moveFaces(native, by));
  }

  private sketch(sm: Smlib, commands: SketchCommand[]): ReturnType<Smlib['makeFace']> {
    if (!Array.isArray(commands)) throw new GuardError('UNSUPPORTED_PROFILE', 'Missing sketch commands');
    let pen: [number,number,number] = [0,0,0];
    let start = pen;
    const edges: Edge[] = [];
    const points: Point2[] = [];
    for (const c of commands) {
      if (c.kind === 'moveTo') { pen=[c.x.evaluated,c.y.evaluated,0]; start=pen; continue; }
      let edge: Edge;
      if (c.kind === 'lineTo') {
        const next: [number,number,number] = [c.x.evaluated,c.y.evaluated,0];
        edge=sm.Line(pen,next); pen=next;
      } else if (c.kind === 'threePointsArc') {
        const next: [number,number,number] = [c.x.evaluated,c.y.evaluated,0];
        edge=sm.ThreePointArc(pen,[c.midX.evaluated,c.midY.evaluated,0],next); pen=next;
      } else if (c.kind === 'spline' && !c.startTangent && !c.endTangent && !c.tension) {
        const pts = c.points.map(p => [p.x.evaluated,p.y.evaluated,0] as [number,number,number]);
        edge=sm.Spline(...pts); pen=pts.at(-1)!;
      } else if (c.kind === 'close') {
        if (Math.hypot(pen[0]-start[0],pen[1]-start[1]) < 1e-9) continue;
        edge=sm.Line(pen,start); pen=start;
      } else throw new GuardError('UNSUPPORTED_PROFILE', `Sketch command ${c.kind} uses OCCT`);
      edges.push(edge);
      const samples = c.kind === 'lineTo' || c.kind === 'close' ? 1 : 32;
      for (let i=0;i<samples;i++) { const v=edge.pointAt(i/samples); points.push([v.x,v.y]); }
    }
    requireSimpleProfile(points);
    return sm.makeFace(new sm.Wire(edges));
  }
}

export const createSmlibLowerer = (session?: LowererSession): SmlibLowerer => new SmlibLowerer(session);
