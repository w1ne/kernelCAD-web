// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { assertTopoRefSafeName } from '../../kernel/naming/uniquenessValidator';
import { KernelError } from '../../shared/intent/kernelError';
import type { EditableVec3, FeatureId, Param, Unit, Vec3, Vec3Param } from '../../shared/intent/types';
import { formatScalarForError, isValidEditableVec3 } from '../../shared/intent/types';
import {
  makeConnector,
  normalizeConnectorOriginInput,
  type Connector,
} from '../mates/connector';
import { parseConnectorRef } from '../mates/mate';
import { toVec3Param } from '../../shared/runtime/editableHelpers';
import { paramExprToDebugString, type ParamRefExpr } from '../../shared/runtime/paramRef';
import { Transform } from '../../shared/runtime/se3';
import type { PartLineage } from '../../kernel/naming/evolutionRecord';
import type { Shape } from './proxy';
import type { CaptureSession } from './captureSession';
import { resolveMaterial, type ResolvedMaterial } from '../properties/materialLibrary';
import { copyMateCapacity } from './assemblyMateCapacity';
import type { Assembly } from './assembly';
import type {
  AssemblyConnectorFrame,
  AssemblyConnectorFrameStored,
  AssemblyConnectorOpts,
  AssemblyConnectorRef,
  AssemblyCrossSection,
  AssemblyPartOpts,
  AssemblyPartRef,
  AssemblyPartStored,
  SubAssemblyHandle,
} from './assemblyTypes';
import type { AssemblyState } from './assemblyState';
import type { WrapGeomOptions, WrapGeomRecord } from '../mates/tendon';

function normalizeConnectors(
  partName: string,
  featureId: FeatureId,
  connectors: Record<string, AssemblyConnectorFrame> | undefined,
): Record<string, AssemblyConnectorFrameStored> {
  const normalized: Record<string, AssemblyConnectorFrameStored> = {};
  for (const [name, frame] of Object.entries(connectors ?? {})) {
    assertTopoRefSafeName(name, 'connector-name', featureId);
    if (!isValidEditableVec3(frame.origin)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' origin must be a finite Vec3 (numbers or ParamRef<number>); got ${formatScalarForError(frame.origin)}.`,
        featureId,
        'Pass connector frames as { origin: [x, y, z], axis?: [x, y, z] }; coords may be number or ParamRef.',
      );
    }
    if (frame.axis !== undefined && !isValidEditableVec3(frame.axis)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${name}' on part '${partName}' axis must be a finite Vec3; got ${formatScalarForError(frame.axis)}.`,
        featureId,
        'Pass connector axis as [x, y, z], or omit it; coords may be number or ParamRef.',
      );
    }
    normalized[name] = frame.axis === undefined
      ? { origin: toVec3Param(frame.origin, 'mm') }
      : { origin: toVec3Param(frame.origin, 'mm'), axis: toVec3Param(frame.axis, 'unitless') };
  }
  return normalized;
}

type TransformedCatalogConnector =
  | {
      name: string;
      type: 'frame';
      origin: Vec3;
      normal: Vec3;
    }
  | {
      name: string;
      type: 'axis';
      origin: Vec3;
      axis: Vec3;
    };

function mutableVec3(vector: readonly [number, number, number]): Vec3 {
  return [vector[0], vector[1], vector[2]];
}

function literalCatalogTransformParam(
  value: Param,
  shapeId: FeatureId,
  transformLabel: string,
): number {
  if (value.paramRef !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part cannot promote catalog connectors for shape '${shapeId}' because its ${transformLabel} uses a ParamRef.`,
      shapeId,
      'Use only literal translate and rotate transforms on catalog-backed shapes before adding them to an assembly.',
    );
  }
  return value.evaluated;
}

function literalCatalogTransformVec3(
  value: Vec3Param,
  shapeId: FeatureId,
  transformLabel: string,
): Vec3 {
  return [
    literalCatalogTransformParam(value.x, shapeId, `${transformLabel}.x`),
    literalCatalogTransformParam(value.y, shapeId, `${transformLabel}.y`),
    literalCatalogTransformParam(value.z, shapeId, `${transformLabel}.z`),
  ];
}

/**
 * Catalog connector manifests describe a shape's untransformed local frame.
 * Preserve that exact authored meaning through rigid, literal Shape transforms
 * so the legacy connector-placement and mate connector APIs agree. Generic
 * autoConnectors deliberately never enter this path.
 */
function transformCatalogConnectors(
  session: CaptureSession,
  shape: Shape,
): TransformedCatalogConnector[] {
  const catalogConnectors = session.catalogConnectors.get(shape.id);
  if (catalogConnectors === undefined) return [];

  const transforms = session.getRecords().find((record) => record.id === shape.id)?.transforms ?? [];
  let total = Transform.identity();
  for (const transform of transforms) {
    let next: Transform;
    if (transform.op === 'translate') {
      const vector = literalCatalogTransformVec3(transform.vec, shape.id, 'translate');
      next = Transform.translation(vector[0], vector[1], vector[2]);
    } else if (transform.op === 'rotateAxis') {
      const axis = literalCatalogTransformVec3(transform.axis, shape.id, 'rotate.axis');
      const degrees = literalCatalogTransformParam(transform.degrees, shape.id, 'rotate.degrees');
      const pivot = transform.pivot === undefined
        ? [0, 0, 0] as Vec3
        : literalCatalogTransformVec3(transform.pivot, shape.id, 'rotate.pivot');
      next = Transform.rotationAroundPivot(axis, degrees, pivot);
    } else {
      const label = transform.op === 'scale' ? 'scale' : 'reflect';
      throw new KernelError(
        'feature.invalid-args',
        `assembly.part cannot promote catalog connectors for shape '${shape.id}' through ${label}: catalog interfaces require rigid transforms.`,
        shape.id,
        'Use only literal translate and rotate transforms on catalog-backed shapes before adding them to an assembly.',
      );
    }
    // Shape transforms execute in declaration order. Transform.compose reads
    // "apply other, then this", so each new transform pre-multiplies the
    // accumulated local-frame transform.
    total = next.compose(total);
  }

  return catalogConnectors.map((connector): TransformedCatalogConnector => {
    const origin = mutableVec3(total.point(connector.origin));
    if (connector.type === 'frame') {
      return {
        name: connector.name,
        type: 'frame',
        origin,
        normal: mutableVec3(total.axisDir(connector.normal)),
      };
    }
    return {
      name: connector.name,
      type: 'axis',
      origin,
      axis: mutableVec3(total.axisDir(connector.axis)),
    };
  });
}

/** Sanity-check every numeric field on an authored cross-section. Lengths
 *  must be finite + positive; an invalid field raises a `feature.invalid-args`
 *  at capture time so beam-mode load checks never see NaN-laced sections. */
function validateCrossSection(
  partName: string,
  featureId: FeatureId,
  cs: AssemblyCrossSection,
): void {
  const ensurePositive = (label: string, value: number): void => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly part '${partName}': crossSection ${label} must be a positive finite number; got ${formatScalarForError(value)}.`,
        featureId,
        'Pass every cross-section length in millimetres as a finite number > 0.',
      );
    }
  };
  ensurePositive('lengthMm', cs.lengthMm);
  if (cs.kind === 'rectangle') {
    ensurePositive('widthMm', cs.widthMm);
    ensurePositive('heightMm', cs.heightMm);
  } else if (cs.kind === 'circle') {
    ensurePositive('radiusMm', cs.radiusMm);
  } else {
    ensurePositive('flangeWidthMm', cs.flangeWidthMm);
    ensurePositive('flangeThicknessMm', cs.flangeThicknessMm);
    ensurePositive('webHeightMm', cs.webHeightMm);
    ensurePositive('webThicknessMm', cs.webThicknessMm);
  }
}

function paramToExpr(p: Param): ParamRefExpr {
  if (p.paramRef === undefined) {
    return { kind: 'lit', value: p.evaluated };
  }
  if (typeof p.paramRef === 'string') {
    return { kind: 'param', name: p.paramRef };
  }
  return p.paramRef;
}

function paramFromExpr(expr: ParamRefExpr, unit: Unit, evaluatedSnapshot: number): Param {
  return {
    expression: `{$paramExpr:${paramExprToDebugString(expr)}}`,
    unit,
    evaluated: evaluatedSnapshot,
    paramRef: expr,
  };
}

function addParams(a: Param, b: Param): Param {
  if (a.paramRef === undefined && b.paramRef === undefined) {
    return {
      expression: `(${a.expression} + ${b.expression})`,
      unit: a.unit,
      evaluated: a.evaluated + b.evaluated,
    };
  }
  return paramFromExpr(
    { kind: 'binop', op: '+', left: paramToExpr(a), right: paramToExpr(b) },
    a.unit,
    a.evaluated + b.evaluated,
  );
}

function subtractParams(a: Param, b: Param): Param {
  if (a.paramRef === undefined && b.paramRef === undefined) {
    return {
      expression: `(${a.expression} - ${b.expression})`,
      unit: a.unit,
      evaluated: a.evaluated - b.evaluated,
    };
  }
  return paramFromExpr(
    { kind: 'binop', op: '-', left: paramToExpr(a), right: paramToExpr(b) },
    a.unit,
    a.evaluated - b.evaluated,
  );
}

function resolvePartPlacement(
  assemblyName: string,
  partName: string,
  featureId: FeatureId,
  explicitAt: EditableVec3 | undefined,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  connect: AssemblyPartOpts['connect'],
): Vec3Param {
  if (!connect) {
    return toVec3Param(explicitAt ?? [0, 0, 0], 'mm');
  }
  const local = connectors[connect.connector];
  if (!local) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connector '${connect.connector}' is not defined on part '${partName}'.`,
      featureId,
      'Declare the connector in opts.connectors before using opts.connect.connector.',
    );
  }
  if (connect.to.assemblyName === undefined || connect.to.partId === undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connect target is not a valid connector reference.`,
      featureId,
      'Pass a connector returned by part.connector(name).',
    );
  }
  if (connect.to.assemblyName !== assemblyName) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part connect target '${connect.to.partName}.${connect.to.connector}' belongs to assembly '${connect.to.assemblyName}', not '${assemblyName}'.`,
      featureId,
      'Only connect parts within the same assembly.',
    );
  }
  if (explicitAt !== undefined) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part cannot combine explicit at with connector placement.`,
      featureId,
      'Use either at: [x, y, z] or connect: { connector, to }, not both.',
    );
  }
  return {
    x: subtractParams(connect.to.worldOrigin.x, local.origin.x),
    y: subtractParams(connect.to.worldOrigin.y, local.origin.y),
    z: subtractParams(connect.to.worldOrigin.z, local.origin.z),
  };
}

/** Build the part-ref `connector` chain method.
 *
 *  Overload: `connector(name)` returns the v0.5 kinematic AssemblyConnectorRef;
 *  `connector(name, opts)` registers a v0.6 mate-style Connector and returns
 *  the part-ref for chaining. Defined as a standalone function so the
 *  overloaded union return type can be narrowed by `opts !== undefined`.
 *  `getRef` resolves the part ref the registering form chains back to; it is
 *  assigned by `makePartRef` before the method can be called. Extracted from
 *  `makePartRef` to keep it under the quality-ratchet function-length
 *  budget. */
function createPartConnector(
  assemblyName: string,
  id: FeatureId,
  name: string,
  at: Vec3Param,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  mateConnectors: Connector[],
  getRef: () => AssemblyPartRef,
): (connectorName: string, opts?: AssemblyConnectorOpts) => AssemblyConnectorRef | AssemblyPartRef {
  return (
    connectorName: string,
    opts?: AssemblyConnectorOpts,
  ): AssemblyConnectorRef | AssemblyPartRef => {
    if (opts !== undefined) {
      assertTopoRefSafeName(connectorName, 'connector-name', id);
      if (mateConnectors.some((c) => c.name === connectorName)) {
        throw new KernelError(
          'feature.invalid-args',
          `assembly.connector.duplicate-name: part '${name}' already has a connector named '${connectorName}'.`,
          id,
          `invalid-args.assembly.connector-duplicate-name — rename one of the connectors on '${name}'.`,
        );
      }
      // F-surface F4: opts.origin accepts a `@kc[<part>/<kind>/<name>]` string
      // alongside the structured ConnectorOrigin union. Normalise here BEFORE
      // constructing the Connector record so downstream solvers see only the
      // structured form.
      const normalizedOrigin = normalizeConnectorOriginInput(opts.origin, name);
      mateConnectors.push(
        makeConnector({
          name: connectorName,
          type: opts.type,
          origin: normalizedOrigin,
          axis: opts.axis,
          normal: opts.normal,
          ...(opts.jointClearanceRadius !== undefined
            ? { jointClearanceRadius: opts.jointClearanceRadius }
            : {}),
        }),
      );
      return getRef();
    }
    const frame = connectors[connectorName];
    if (!frame) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${connectorName}' is not defined on part '${name}'.`,
        id,
        'Use one of the connector names declared in assembly.part(..., { connectors }).',
      );
    }
    const worldOrigin: Vec3Param = {
      x: addParams(at.x, frame.origin.x),
      y: addParams(at.y, frame.origin.y),
      z: addParams(at.z, frame.origin.z),
    };
    return {
      assemblyName,
      partId: id,
      partName: name,
      connector: connectorName,
      origin: frame.origin,
      worldOrigin,
      ...(frame.axis !== undefined ? { axis: frame.axis } : {}),
    };
  };
}

/** Build the part-ref `wrapGeom` chain method.
 *
 *  P11 Slice 2 — declare a collision-OFF wrap cylinder for tendon
 *  routing. Mirrors the mate-style `connector(name, opts)` chain: validate,
 *  push into the shared `wrapGeoms` array, return `ref`. `getRef` resolves
 *  the part ref to chain; it is assigned by `makePartRef` before the method
 *  can be called. Extracted from `makePartRef` to keep it under the
 *  quality-ratchet function-length budget. */
function createPartWrapGeom(
  id: FeatureId,
  name: string,
  wrapGeoms: WrapGeomRecord[],
  getRef: () => AssemblyPartRef,
): (wrapName: string, opts: WrapGeomOptions) => AssemblyPartRef {
  return (
    wrapName: string,
    opts: WrapGeomOptions,
  ): AssemblyPartRef => {
    assertTopoRefSafeName(wrapName, 'wrap-geom-name', id);
    if (wrapGeoms.some((w) => w.name === wrapName)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.duplicate-name: part '${name}' already has a wrap geom named '${wrapName}'.`,
        id,
        `invalid-args.assembly.wrap-geom-duplicate-name — rename one of the wrap geoms on '${name}'.`,
      );
    }
    const axis = opts.axis;
    const axisLenSq = axis[0] * axis[0] + axis[1] * axis[1] + axis[2] * axis[2];
    if (
      !Number.isFinite(axis[0]) || !Number.isFinite(axis[1]) || !Number.isFinite(axis[2]) ||
      axisLenSq <= 0
    ) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.invalid-axis: wrap geom '${wrapName}' on part '${name}' needs a finite non-zero axis; got [${formatScalarForError(axis[0])}, ${formatScalarForError(axis[1])}, ${formatScalarForError(axis[2])}].`,
        id,
        `invalid-args.assembly.wrap-geom-invalid-axis — pass axis: [x, y, z] pointing along the cylinder centerline (the arm's long axis for a balance spring).`,
      );
    }
    if (!Number.isFinite(opts.radius) || opts.radius <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.invalid-radius: wrap geom '${wrapName}' on part '${name}' radius must be a positive finite number; got ${formatScalarForError(opts.radius)}.`,
        id,
        `invalid-args.assembly.wrap-geom-invalid-radius — pass radius: <positive mm>. Size it to the arm half-thickness plus the cable standoff so the spring rides clear of the body.`,
      );
    }
    if (opts.halfLengthMm !== undefined && (!Number.isFinite(opts.halfLengthMm) || opts.halfLengthMm <= 0)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly.wrap-geom.invalid-half-length: wrap geom '${wrapName}' on part '${name}' halfLengthMm must be a positive finite number when provided; got ${formatScalarForError(opts.halfLengthMm)}.`,
        id,
        `invalid-args.assembly.wrap-geom-invalid-half-length — pass halfLengthMm: <positive mm>, or omit it for an effectively-infinite routing cylinder.`,
      );
    }
    const origin = opts.origin ?? [0, 0, 0];
    const rec: WrapGeomRecord = {
      name: wrapName,
      axis: [axis[0], axis[1], axis[2]],
      origin: [origin[0], origin[1], origin[2]],
      radiusMm: opts.radius,
      ...(opts.halfLengthMm !== undefined ? { halfLengthMm: opts.halfLengthMm } : {}),
    };
    wrapGeoms.push(rec);
    return getRef();
  };
}

export function makePartRef(
  assemblyName: string,
  id: FeatureId,
  name: string,
  at: Vec3Param,
  connectors: Record<string, AssemblyConnectorFrameStored>,
  mateConnectors: Connector[],
  wrapGeoms: WrapGeomRecord[],
  addPart: (name: string, shape: Shape, opts?: AssemblyPartOpts) => AssemblyPartRef,
  // Owning assembly — the ref's chain terminators (`model` / `solve` /
  // `solvedModel`) delegate straight to it so there is exactly one
  // implementation of each.
  owner: Assembly,
): AssemblyPartRef {
  const connector = createPartConnector(
    assemblyName, id, name, at, connectors, mateConnectors, () => ref,
  );
  const wrapGeom = createPartWrapGeom(id, name, wrapGeoms, () => ref);
  const ref: AssemblyPartRef = {
    id,
    name,
    assemblyName,
    at,
    connectors,
    mateConnectors,
    wrapGeoms,
    connector: connector as AssemblyPartRef['connector'],
    wrapGeom,
    part: addPart,
    model: () => owner.model(),
    solve: (poses) => owner.solve(poses),
    solvedModel: (...args) => owner.solvedModel(...args),
  };
  return ref;
}

export function recordPart(state: AssemblyState, arm: Assembly, name: string, shape: Shape, opts: AssemblyPartOpts = {}): AssemblyPartRef {
  return recordPartInternal(state, arm, name, shape, opts, true);
}

/** Finish precedence: apply the material's default finish ONLY when the
 *  shape carries no explicit appearance yet (explicit `.finish()` /
 *  `.color()` / `.material()` on the shape always wins). Go through the same
 *  `shape.finish(...)` proxy the author would call — one source of truth for
 *  the appearance write, its validation, and its per-face plumbing. Split
 *  out of `resolvePartMaterialAndValidateOpts` to keep its branching
 *  complexity under the quality-ratchet budget; no behavior change. */
function applyMaterialFinishDefault(
  state: AssemblyState,
  shape: Shape,
  resolvedMaterial: ResolvedMaterial | undefined,
): void {
  if (resolvedMaterial?.finish === undefined) return;
  const record = state.session.getRecords().find((r) => r.id === shape.id);
  const md = record?.metadata;
  const hasExplicitAppearance =
    md?.material !== undefined ||
    md?.color !== undefined ||
    (md?.materialByLabel !== undefined && Object.keys(md.materialByLabel).length > 0);
  if (!hasExplicitAppearance) {
    shape.finish(resolvedMaterial.finish);
  }
}

/** Validate `opts.at` / `opts.density` / `opts.material` / `opts.crossSection` /
 *  `opts.role`, and resolve the effective density + finish from a named
 *  material. Split out of `recordPartInternal` to keep its branching
 *  complexity under the quality-ratchet budget; no behavior change from the
 *  inline version it replaces. */
function resolvePartMaterialAndValidateOpts(
  state: AssemblyState,
  name: string,
  shape: Shape,
  opts: AssemblyPartOpts,
): { resolvedMaterial: ResolvedMaterial | undefined; effectiveDensity: number | undefined } {
  if (opts.at !== undefined && !isValidEditableVec3(opts.at)) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly part placement must be a finite Vec3; got ${formatScalarForError(opts.at)}.`,
      shape.id,
      'Pass at: [x, y, z], or omit it; coords may be number or ParamRef.',
    );
  }
  if (opts.density !== undefined) {
    if (!Number.isFinite(opts.density) || opts.density <= 0) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly part '${name}': density must be a positive finite number; got ${formatScalarForError(opts.density)}.`,
        shape.id,
        'Pass density: <kg/m^3>, or omit it to use the 1000 kg/m^3 default. Typical: steel 7850, aluminum 2700, ABS 1050.',
      );
    }
  }
  // Named material: seeds a density default AND a default finish. Resolve it
  // FIRST — an unknown name throws here (naming the valid materials) before
  // any part record is minted, so a typo never silently produces a
  // water-density part with no appearance.
  let resolvedMaterial: ResolvedMaterial | undefined;
  if (opts.material !== undefined) {
    resolvedMaterial = resolveMaterial(opts.material, shape.id);
  }
  // Density precedence: an explicit `density` opt wins over the material's
  // catalog density; the material only seeds the DEFAULT.
  const effectiveDensity =
    opts.density !== undefined ? opts.density : resolvedMaterial?.density;
  applyMaterialFinishDefault(state, shape, resolvedMaterial);
  if (opts.crossSection !== undefined) {
    validateCrossSection(name, shape.id, opts.crossSection);
  }
  if (opts.role !== undefined && opts.role !== 'structure' && opts.role !== 'contact-target') {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.part.invalid-role: part '${name}' role must be 'structure' or 'contact-target'; got ${formatScalarForError(opts.role)}.`,
      shape.id,
      `invalid-args.assembly.part-invalid-role — pass role: 'contact-target' only for external contact/load targets, or omit role for structural parts.`,
    );
  }
  return { resolvedMaterial, effectiveDensity };
}

/** Merge promoted catalog connectors into the user-declared connector map,
 *  rejecting a name collision. Split out of `recordPartInternal` for the
 *  same complexity-budget reason as `resolvePartMaterialAndValidateOpts`;
 *  no behavior change. */
function mergeCatalogConnectors(
  connectors: Record<string, AssemblyConnectorFrameStored>,
  transformedCatalogConnectors: readonly TransformedCatalogConnector[],
  shapeId: FeatureId,
): void {
  for (const connector of transformedCatalogConnectors) {
    if (Object.hasOwn(connectors, connector.name)) {
      throw new KernelError(
        'feature.invalid-args',
        `assembly connector '${connector.name}' is declared both by the catalog part and assembly.part options.`,
        shapeId,
        'Rename the user-declared connector or use the catalog connector as-is.',
      );
    }
    connectors[connector.name] = {
      origin: toVec3Param(connector.origin, 'mm'),
      axis: toVec3Param(
        connector.type === 'frame' ? connector.normal : connector.axis,
        'unitless',
      ),
    };
  }
}

/** Internal part route used by `recordSubAssembly` to copy already-promoted
 * catalog interfaces without registering them a second time. */
export function recordPartInternal(
  state: AssemblyState,
  arm: Assembly,
  name: string,
  shape: Shape,
  opts: AssemblyPartOpts,
  promoteCatalogConnectors: boolean,
): AssemblyPartRef {
  assertTopoRefSafeName(name, 'part-name', shape.id);
  const { resolvedMaterial, effectiveDensity } = resolvePartMaterialAndValidateOpts(state, name, shape, opts);
  const connectors = normalizeConnectors(name, shape.id, opts.connectors);
  const transformedCatalogConnectors = promoteCatalogConnectors
    ? transformCatalogConnectors(state.session, shape)
    : [];
  mergeCatalogConnectors(connectors, transformedCatalogConnectors, shape.id);
  const at = resolvePartPlacement(state.name, name, shape.id, opts.at, connectors, opts.connect);
  const record = state.session.assemblyPart(state.name, name, shape, { at, connectors, placedBy: opts.connect });
  // Q1.5: write the part-lineage entry now that the capture-session has
  // minted the `assemblyPart` FeatureRecord. The lineage's `featureId`
  // is the same id the FeatureRecord carries — anchors part-level Query
  // resolution (`kc.q.part(kc.q.createdBy('<featureId>'))`) to the
  // existing FeatureRecord graph rather than introducing a parallel
  // id stream.
  const lineage: PartLineage = {
    featureId: record.id,
    featureName: name,
    featureKind: 'assemblyPart',
  };
  state.partLineage.set(name, lineage);
  // Shared mutable array: the part-ref's `.connector(name, opts)` chain
  // method pushes into this array, and the `AssemblyPartStored` record
  // below references the same array via spread (arrays are by-reference),
  // so `makeScene` sees additions made after `part(...)` returns.
  const mateConnectors: Connector[] = [];
  const wrapGeoms: WrapGeomRecord[] = [];
  const part = makePartRef(
    state.name, record.id, name, at, connectors, mateConnectors, wrapGeoms,
    // Fluent chaining: `arm.part(a).part(b)` — the ref's `.part(...)` adds
    // another part to this same assembly (delegates straight to this method).
    (chainName, chainShape, chainOpts) => recordPart(state, arm, chainName, chainShape, chainOpts),
    arm,
  );
  for (const connector of transformedCatalogConnectors) {
    part.connector(connector.name, {
      type: connector.type,
      origin: { kind: 'vec3', value: connector.origin },
      ...(connector.type === 'frame'
        ? { normal: connector.normal }
        : { axis: connector.axis }),
    });
  }
  const stored: AssemblyPartStored = {
    ...part,
    originalShape: shape,
    ...(opts.connect !== undefined ? { connectParentId: opts.connect.to.partId } : {}),
    ...(effectiveDensity !== undefined ? { density: effectiveDensity } : {}),
    ...(resolvedMaterial !== undefined ? { material: resolvedMaterial.name } : {}),
    ...(opts.crossSection !== undefined ? { crossSection: opts.crossSection } : {}),
    ...(opts.role !== undefined ? { role: opts.role } : {}),
  };
  state.parts.push(stored);
  if (opts.connect) {
    state.session.assemblyConnect(
      state.name,
      opts.connect.name ?? `${opts.connect.to.partName}.${opts.connect.to.connector}-${name}.${opts.connect.connector}`,
      opts.connect.to,
      part.connector(opts.connect.connector),
    );
  }
  return part;
}

/**
 * Compose another assembly into this one as a sub-assembly (Slice 1:
 * flattening import). Surfaced by Exp-E nested-sub-assembly: every CAD
 * competitor (Fusion / Onshape / ForgeCAD) treats sub-assemblies as
 * first-class, but kernelCAD had no composition API at all — agents had
 * to flatten by hand, losing the namespace boundary.
 *
 * This Slice copies all of `other`'s parts and mates into `state`, with
 * every imported name prefixed by `${name}_`. The prefix uses underscore
 * (not dot) so connector-ref parsing still works: `'gripper_wrist.in'`
 * parses as part='gripper_wrist', connector='in' under the existing
 * single-dot split.
 *
 * Returned handle exposes `.ref(origPart, conn?)` and `.part(origPart)`
 * so the caller can mate INTO the imported parts without manually
 * spelling the prefix.
 *
 *   const gripper = kcad.assembly('gripper');
 *   gripper.part('wrist', box(10,10,10)).connector('in', {...});
 *   const robot = kcad.assembly('robot');
 *   robot.part('arm', box(80,20,20)).connector('out', {...});
 *   const sub = robot.subAssembly('grip', gripper);
 *   robot.mate('attach', 'arm.out', sub.ref('wrist', 'in'), 'fastened');
 *
 * Future slices (not in this MVP): true nested solver semantics
 * (per-sub-assembly root selection, sub-assembly instancing for N
 * identical bolts, cross-assembly mates with their own resolution).
 */
export function recordSubAssembly(state: AssemblyState, arm: Assembly, name: string, other: Assembly): SubAssemblyHandle {
  validateSubAssemblyImport(state, arm, name, other);
  const prefix = `${name}_`;
  const importedByOriginalName = importSubAssemblyParts(state, arm, prefix, other);
  importSubAssemblyMates(state, prefix, other);
  const requireImportedPart = (origPartName: string, method: 'ref' | 'part'): AssemblyPartRef => {
    const ref = importedByOriginalName.get(origPartName);
    if (ref) return ref;
    const known = [...importedByOriginalName.keys()].join(', ') || '(none)';
    const extraHint = method === 'ref'
      ? ' Use sub.part(name) to grab the imported AssemblyPartRef.'
      : '';
    throw new KernelError(
      'feature.invalid-args',
      `subAssembly('${name}').${method}: '${origPartName}' is not a part of the imported assembly '${other.name}'. Known parts: ${known}.`,
      undefined,
      `Pass the ORIGINAL part name (before prefixing).${extraHint}`,
    );
  };
  return {
    prefix,
    ref: (origPartName: string, connectorName?: string): string => {
      requireImportedPart(origPartName, 'ref');
      return connectorName !== undefined
        ? `${prefix}${origPartName}.${connectorName}`
        : `${prefix}${origPartName}`;
    },
    part: (origPartName: string): AssemblyPartRef => requireImportedPart(origPartName, 'part'),
  };
}

function validateSubAssemblyImport(state: AssemblyState, arm: Assembly, name: string, other: Assembly): void {
  if (other === arm) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.subAssembly: cannot import an assembly into itself ('${state.name}').`,
      undefined,
      'Pass a DIFFERENT Assembly handle, captured via a separate kcad.assembly(otherName) call.',
    );
  }
  if (typeof name !== 'string' || name.length === 0 || name.includes('.') || name.includes('_')) {
    throw new KernelError(
      'feature.invalid-args',
      `assembly.subAssembly: name '${name}' must be a non-empty string without '.' or '_' (the underscore is reserved for the namespace separator, the dot for connector refs).`,
      undefined,
      "Use a simple identifier like 'grip' or 'leftArm'.",
    );
  }
}

// 1. Copy parts. Use recordPart(...) so the v0.5 record + connectors +
//    placement validation all run as if the user authored each part
//    directly — sub-assembly is observationally identical to a flat
//    authoring (Slice 1 semantics).
function importSubAssemblyParts(
  state: AssemblyState,
  arm: Assembly,
  prefix: string,
  other: Assembly,
): Map<string, AssemblyPartRef> {
  const importedByOriginalName = new Map<string, AssemblyPartRef>();
  for (const op of other.__parts()) {
    const newName = `${prefix}${op.name}`;
    const newRef = recordPartInternal(state, arm, newName, op.originalShape, {
      ...(op.connectors !== undefined ? { connectors: op.connectors } : {}),
    }, false);
    // Copy v0.6 mateConnectors (the .connector(name, opts) chain output)
    // by shallow-copying the array contents. The new part already owns an
    // empty mateConnectors array per `part()`; populate it now so post-
    // import mate authoring resolves the refs.
    for (const conn of op.mateConnectors) {
      newRef.mateConnectors.push(conn);
    }
    importedByOriginalName.set(op.name, newRef);
  }
  return importedByOriginalName;
}

// 2. Copy mates. Remap the partName portion of each `a` / `b` ref by
//    prepending the prefix, leaving the connectorName intact. Mate
//    names are also prefixed so name-uniqueness within `state` holds.
function importSubAssemblyMates(state: AssemblyState, prefix: string, other: Assembly): void {
  const remapRef = (ref: string): string => {
    const { partName, connectorName } = parseConnectorRef(ref);
    return `${prefix}${partName}.${connectorName}`;
  };
  for (const om of other.__mates()) {
    state.mates.push({
      name: `${prefix}${om.name}`,
      a: remapRef(om.a),
      b: remapRef(om.b),
      type: om.type,
      ...(om.pose !== undefined ? { pose: om.pose } : {}),
      ...(om.limitsDeg !== undefined ? { limitsDeg: om.limitsDeg } : {}),
      ...(om.limitsMm !== undefined ? { limitsMm: om.limitsMm } : {}),
      ...(om.capacity !== undefined ? { capacity: copyMateCapacity(om.capacity) } : {}),
      ...(om.maxLoad !== undefined
        ? {
            maxLoad: {
              ...(om.maxLoad.force !== undefined ? { force: om.maxLoad.force } : {}),
              ...(om.maxLoad.torque !== undefined ? { torque: om.maxLoad.torque } : {}),
            },
          }
        : {}),
    });
  }
}
