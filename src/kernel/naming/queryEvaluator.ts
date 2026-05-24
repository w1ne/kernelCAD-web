// src/kernel/naming/queryEvaluator.ts
//
// Q3 — the Query evaluator. evaluate(query, scene) → ResolvedEntity[].
//
// Lazy at lowering per D0.3 (b): the Query AST is interpreted against the
// scene's lowered OcctBackend + records on every call; no result caching.
// Construction (kc.q.face(...) and friends) is cheap and side-effect-free.
//
// Strings-as-sugar (D0.1 (c)): the @kc[...] string path reaches this
// evaluator via the `fromString` AST op, which routes through F-foundation's
// `parseTopoRef`. Both surface syntaxes bottom out on one internal Query
// value, so a face built either way resolves through the same code path.
//
// Edge-branch scope. Per Finding #33, OcctBackend.edgeHistoryMap is a
// declared type with zero population sites in develop today. Q3 ships the
// face-branch fully and surfaces `query.unsupported-entity-type` for every
// other kind. The wiring across the ~10 feature lowerers is a separate slice.

import type {
  Query,
  QueryAst,
  QueryKind,
  GeometryType,
  ResolvedEntity,
  QueryScene,
  EntityMarker,
} from './query';
import { __installEvaluatorDelegates } from './query';
import {
  parseTopoRef,
  formatTopoRef,
} from './index';
import type { FaceLineage, FaceHash } from './evolutionRecord';
import {
  throwQueryEmpty,
  throwQueryOverDetermined,
  throwQueryUnknownId,
  throwQueryUnknownLabel,
  throwQueryUnsupportedEntityType,
  throwQueryCompositionStrictFailure,
} from './queryDiagnostics';

/** Public entry-point. Returns canonical-ordered entities (sort-by-ref) per
 *  D0.5 (a); spatial-filter override via filterClosestTo per D0.5 (c). */
export function evaluate<T>(
  query: Query<T>,
  scene: QueryScene,
): ReadonlyArray<ResolvedEntity<T extends EntityMarker ? T : EntityMarker>> {
  const lenient = query.lenient ?? false;
  let entities: ResolvedEntity[];
  try {
    entities = evalAst(query.ast, scene, lenient, query);
  } catch (e) {
    if (lenient && isQueryDiagnostic(e)) {
      // Lenient mode swallows the diagnostic and contributes zero entities.
      return [] as unknown as ReadonlyArray<ResolvedEntity<T extends EntityMarker ? T : EntityMarker>>;
    }
    throw e;
  }
  return entities as unknown as ReadonlyArray<ResolvedEntity<T extends EntityMarker ? T : EntityMarker>>;
}

/** Exactly-one resolution. Throws query.empty on N=0; query.over-determined on N>1. */
export function evaluateUnique<T>(
  query: Query<T>,
  scene: QueryScene,
  consumer = 'unknown-consumer',
): ResolvedEntity<T extends EntityMarker ? T : EntityMarker> {
  const all = evaluate(query, scene);
  if (all.length === 0) throwQueryEmpty(query, scene, false);
  if (all.length > 1) throwQueryOverDetermined(query, scene, all, consumer);
  return all[0];
}

// ---------------------------------------------------------------------------
// AST dispatch.
// ---------------------------------------------------------------------------

function evalAst(
  ast: QueryAst,
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  switch (ast.op) {
    case 'nothing':
      return [];
    case 'everything':
      return collectAllOfKind(ast.kind, scene, originatingQuery);
    case 'createdBy':
      return collectByCreatedBy(ast.id, ast.kind, scene, originatingQuery);
    case 'ownedByPart':
    case 'ownerPart':
      // Part-registry resolution lands in Q6 alongside assembly.parts.
      // For now, return [] so composed queries don't crash on part-side
      // sub-queries during face-only evaluation.
      return [];
    case 'union':
      return setAlgebraUnion(ast.queries, scene, lenient, originatingQuery);
    case 'intersection':
      return setAlgebraIntersection(ast.queries, scene, lenient, originatingQuery);
    case 'subtraction':
      return setAlgebraSubtraction(ast.a, ast.b, scene, lenient, originatingQuery);
    case 'containsPoint':
      return filterContainsPoint(
        evalAst(ast.query, scene, lenient, originatingQuery),
        ast.point,
      );
    case 'closestTo':
      return filterClosestTo(
        evalAst(ast.query, scene, lenient, originatingQuery),
        ast.point,
        ast.k,
      );
    case 'geometryType':
      return filterGeometryType(
        evalAst(ast.query, scene, lenient, originatingQuery),
        ast.geomType,
        scene,
      );
    case 'entityFilter':
      return filterEntityKind(ast.query, ast.kind, scene, lenient, originatingQuery);
    case 'withLabel':
      return filterWithLabel(ast.query, ast.label, scene, lenient, originatingQuery);
    case 'withFeatureName':
      return filterWithFeatureName(ast.query, ast.name, scene, lenient, originatingQuery);
    case 'nthElement':
      return filterNth(evalAst(ast.query, scene, lenient, originatingQuery), ast.index);
    case 'fromString':
      return resolveFromString(ast.ref, scene, originatingQuery);
  }
}

// ---------------------------------------------------------------------------
// `everything` — enumerate every entity of a kind. Q3 ships face fully;
// other kinds throw query.unsupported-entity-type (Finding #33).
// ---------------------------------------------------------------------------

function collectAllOfKind(
  kind: QueryKind,
  scene: QueryScene,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  if (kind !== 'face') {
    throwQueryUnsupportedEntityType(originatingQuery, scene, kind);
  }
  const map = scene.backend.historyMap;
  if (!map) return [];
  const out: ResolvedEntity[] = [];
  for (const [hash, lineage] of map) {
    out.push(buildFaceEntity(hash, lineage));
  }
  return sortCanonical(out);
}

// ---------------------------------------------------------------------------
// `createdBy` — load-bearing per spec §1.1. Walks the lineage map.
// ---------------------------------------------------------------------------

function collectByCreatedBy(
  id: string,
  kind: QueryKind | undefined,
  scene: QueryScene,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  if (kind !== undefined && kind !== 'face') {
    throwQueryUnsupportedEntityType(originatingQuery, scene, kind);
  }
  const knownIds = scene.records?.map((r) => r.id) ?? [];
  if (knownIds.length > 0 && !knownIds.includes(id)) {
    throwQueryUnknownId(originatingQuery, scene, id, knownIds);
  }
  const map = scene.backend.historyMap;
  if (!map) return [];
  const out: ResolvedEntity[] = [];
  for (const [hash, lineage] of map) {
    if (lineage.featureId === id || lineage.rootFeatureId === id) {
      out.push(buildFaceEntity(hash, lineage));
    }
  }
  return sortCanonical(out);
}

// ---------------------------------------------------------------------------
// `entityFilter` — narrow a sub-query to one entity kind.
// ---------------------------------------------------------------------------

function filterEntityKind(
  subAst: QueryAst,
  kind: QueryKind,
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  if (kind !== 'face') {
    throwQueryUnsupportedEntityType(originatingQuery, scene, kind);
  }
  // Plain `q.face()` (or `q.face(...)` with no narrowing filters) lands here
  // with subAst === { op: 'everything', kind: 'face' } — short-circuit to
  // the kind-collect path.
  if (subAst.op === 'everything') {
    return collectAllOfKind(kind, scene, originatingQuery);
  }
  if (subAst.op === 'nothing') {
    return [];
  }
  const inner = evalAst(subAst, scene, lenient, originatingQuery);
  return inner.filter((e) => e.kind === kind);
}

// ---------------------------------------------------------------------------
// `withLabel` / `withFeatureName` — narrow by lineage label / feature-name.
// ---------------------------------------------------------------------------

function filterWithLabel(
  subAst: QueryAst,
  label: string,
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  // q.face(q.withLabel('foo')) folds into entityFilter(intersection(everything,
  // withLabel)) via the queryConstructors compose path. When the sub-query
  // resolves to the bare `withLabel` AST node (op === 'withLabel' wrapping
  // `nothing`), default the candidate set to every face on the scene; the
  // chainable .and() path supplies a real candidate set instead.
  const candidates =
    subAst.op === 'nothing' || subAst.op === 'withLabel' ||
    subAst.op === 'withFeatureName' || subAst.op === 'closestTo' ||
    subAst.op === 'containsPoint' || subAst.op === 'geometryType'
      ? collectAllOfKind('face', scene, originatingQuery)
      : evalAst(subAst, scene, lenient, originatingQuery);
  const knownLabels = collectKnownLabels(scene);
  const hits = candidates.filter((e) => entityHasLabel(e, label, scene));
  if (hits.length === 0 && !knownLabels.has(label) && !lenient) {
    throwQueryUnknownLabel(originatingQuery, scene, label, [...knownLabels]);
  }
  return hits;
}

function filterWithFeatureName(
  subAst: QueryAst,
  name: string,
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  const candidates =
    subAst.op === 'nothing' || subAst.op === 'withLabel' ||
    subAst.op === 'withFeatureName' || subAst.op === 'closestTo' ||
    subAst.op === 'containsPoint' || subAst.op === 'geometryType'
      ? collectAllOfKind('face', scene, originatingQuery)
      : evalAst(subAst, scene, lenient, originatingQuery);
  return candidates.filter((e) => entityHasFeatureName(e, name, scene));
}

function collectKnownLabels(scene: QueryScene): Set<string> {
  const out = new Set<string>();
  const map = scene.backend.historyMap;
  if (!map) return out;
  for (const [, lineage] of map) {
    if (lineage.labelName) out.add(lineage.labelName);
    if (lineage.canonicalName) out.add(lineage.canonicalName);
  }
  return out;
}

function entityHasLabel(e: ResolvedEntity, label: string, scene: QueryScene): boolean {
  if (e.kind !== 'face') return false;
  const lineage = scene.backend.historyMap?.get(e.handle as FaceHash);
  return lineage?.labelName === label || lineage?.canonicalName === label;
}

function entityHasFeatureName(e: ResolvedEntity, name: string, scene: QueryScene): boolean {
  if (e.kind !== 'face') return false;
  const lineage = scene.backend.historyMap?.get(e.handle as FaceHash);
  return lineage?.featureName === name;
}

// ---------------------------------------------------------------------------
// Spatial / geometric filters.
// ---------------------------------------------------------------------------

function filterContainsPoint(
  input: ResolvedEntity[],
  point: [number, number, number],
): ResolvedEntity[] {
  return input.filter((e) => {
    const c = e.snapshot?.centroid;
    if (!c) return false;
    const dx = c[0] - point[0];
    const dy = c[1] - point[1];
    const dz = c[2] - point[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz) < 1e-3;
  });
}

function filterClosestTo(
  input: ResolvedEntity[],
  point: [number, number, number],
  k?: number,
): ResolvedEntity[] {
  const withDist = input.map((e) => {
    const c = e.snapshot?.centroid ?? ([Infinity, Infinity, Infinity] as [number, number, number]);
    const dx = c[0] - point[0];
    const dy = c[1] - point[1];
    const dz = c[2] - point[2];
    return { e, d: Math.sqrt(dx * dx + dy * dy + dz * dz) };
  });
  withDist.sort((a, b) => a.d - b.d);
  return withDist.slice(0, k ?? 1).map((x) => x.e);
}

function filterGeometryType(
  input: ResolvedEntity[],
  geomType: GeometryType,
  scene: QueryScene,
): ResolvedEntity[] {
  return input.filter((e) => {
    if (e.kind !== 'face') return false;
    const lineage = scene.backend.historyMap?.get(e.handle as FaceHash);
    // FaceLineage.surfaceType uses OCCT names ('PLANE' / 'CYLINDRE' / ...).
    // GeometryType uses the public-API names ('PLANE' / 'CYLINDER' / ...).
    // Map between them so the filter passes through cleanly.
    return matchesGeometryType(lineage?.surfaceType, geomType);
  });
}

function matchesGeometryType(
  surfaceType: FaceLineage['surfaceType'] | undefined,
  requested: GeometryType,
): boolean {
  if (!surfaceType) return false;
  if (surfaceType === requested) return true;
  // OCCT's 'CYLINDRE' vs the public-API 'CYLINDER'.
  if (surfaceType === 'CYLINDRE' && requested === 'CYLINDER') return true;
  // OCCT's 'BSPLINE' covers BSPLINE_SURFACE on faces.
  if (surfaceType === 'BSPLINE' && requested === 'BSPLINE_SURFACE') return true;
  return false;
}

function filterNth(input: ResolvedEntity[], index: number): ResolvedEntity[] {
  if (index < 0 || index >= input.length) {
    // query.nth-out-of-range is in the v2-deferred batch; Q3 surfaces an
    // empty list and lets the consumer's query.empty take over. This
    // preserves the strict-by-default contract without registering the
    // v2 code in v1.
    return [];
  }
  return [input[index]];
}

// ---------------------------------------------------------------------------
// Set algebra. Strict by default; lenient annotation swallows per Q4.
// ---------------------------------------------------------------------------

function setAlgebraUnion(
  queries: QueryAst[],
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  const out: ResolvedEntity[] = [];
  const seen = new Set<string>();
  for (const sub of queries) {
    let entities: ResolvedEntity[];
    try {
      entities = evalAst(sub, scene, lenient, originatingQuery);
    } catch (e) {
      if (lenient && isQueryDiagnostic(e)) {
        entities = [];
      } else {
        throwCompositionStrictFailure(originatingQuery, scene, e);
      }
    }
    for (const ent of entities) {
      if (!seen.has(ent.handle)) {
        seen.add(ent.handle);
        out.push(ent);
      }
    }
  }
  return sortCanonical(out);
}

function setAlgebraIntersection(
  queries: QueryAst[],
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  if (queries.length === 0) return [];
  let acc: ResolvedEntity[] | null = null;
  for (const sub of queries) {
    let entities: ResolvedEntity[];
    try {
      // Filter-style sub-asts (closestTo/containsPoint/geometryType/withLabel/
      // withFeatureName) constructed via the bare `q.closestTo(point)` factory
      // wrap a `{ op: 'nothing' }` placeholder for their `query` field — they
      // are intended to filter the surrounding context, not to act on an empty
      // set. When such an op appears inside an intersection, evaluate it
      // against the running accumulator so `.and(closestTo(...))` works as a
      // narrowing operation on the prior entity set.
      if (acc !== null && isPlaceholderFilterAst(sub)) {
        entities = applyFilterAst(sub, acc, scene);
      } else {
        entities = evalAst(sub, scene, lenient, originatingQuery);
      }
    } catch (e) {
      if (lenient && isQueryDiagnostic(e)) {
        entities = [];
      } else {
        throwCompositionStrictFailure(originatingQuery, scene, e);
      }
    }
    if (acc === null) {
      acc = entities;
      continue;
    }
    const handles = new Set(entities.map((e) => e.handle));
    acc = acc.filter((e) => handles.has(e.handle));
  }
  return acc ?? [];
}

/** Filter-style sub-asts that the q.* factories build with `{ op: 'nothing' }`
 *  as a placeholder for their `query` field. When these appear inside an
 *  intersection or entityFilter, they're meant to narrow the surrounding
 *  context, not to act on an empty set. */
function isPlaceholderFilterAst(ast: QueryAst): boolean {
  switch (ast.op) {
    case 'closestTo':
    case 'containsPoint':
    case 'geometryType':
      return ast.query.op === 'nothing';
    case 'withLabel':
    case 'withFeatureName':
      return ast.query.op === 'nothing';
    default:
      return false;
  }
}

/** Apply a placeholder filter-style AST node to an explicit candidate set. */
function applyFilterAst(
  ast: QueryAst,
  candidates: ResolvedEntity[],
  scene: QueryScene,
): ResolvedEntity[] {
  switch (ast.op) {
    case 'closestTo':
      return filterClosestTo(candidates, ast.point, ast.k);
    case 'containsPoint':
      return filterContainsPoint(candidates, ast.point);
    case 'geometryType':
      return filterGeometryType(candidates, ast.geomType, scene);
    case 'withLabel':
      return candidates.filter((e) => entityHasLabel(e, ast.label, scene));
    case 'withFeatureName':
      return candidates.filter((e) => entityHasFeatureName(e, ast.name, scene));
    default:
      return candidates;
  }
}

function setAlgebraSubtraction(
  aAst: QueryAst,
  bAst: QueryAst,
  scene: QueryScene,
  lenient: boolean,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  let aEnts: ResolvedEntity[];
  let bEnts: ResolvedEntity[];
  try {
    aEnts = evalAst(aAst, scene, lenient, originatingQuery);
  } catch (e) {
    if (lenient && isQueryDiagnostic(e)) aEnts = [];
    else throwCompositionStrictFailure(originatingQuery, scene, e);
  }
  try {
    bEnts = evalAst(bAst, scene, lenient, originatingQuery);
  } catch (e) {
    if (lenient && isQueryDiagnostic(e)) bEnts = [];
    else throwCompositionStrictFailure(originatingQuery, scene, e);
  }
  const bHandles = new Set(bEnts.map((e) => e.handle));
  return aEnts.filter((e) => !bHandles.has(e.handle));
}

// ---------------------------------------------------------------------------
// Strings-as-sugar: fromString routes through F-foundation's parseTopoRef
// and converts the result to a Query AST node, then re-enters the evaluator.
// ---------------------------------------------------------------------------

function resolveFromString(
  ref: string,
  scene: QueryScene,
  originatingQuery: Query<unknown>,
): ResolvedEntity[] {
  const parsed = parseTopoRef(ref);
  if ('error' in parsed) {
    // query.invalid-syntax is Q7's code; Q3 surfaces a query.empty as the
    // closest available v1 code. The dedicated code lands in Q7.
    throwQueryEmpty(originatingQuery, scene, false);
  }
  // Map TopoKind to QueryKind. Most are 1:1; 'sketch' isn't a QueryKind so
  // it surfaces as unsupported.
  const queryKind = topoKindToQueryKind(parsed.kind);
  if (!queryKind) {
    throwQueryUnsupportedEntityType(originatingQuery, scene, parsed.kind as QueryKind);
  }
  if (queryKind !== 'face') {
    throwQueryUnsupportedEntityType(originatingQuery, scene, queryKind);
  }
  const labelOrName = parsed.segments.length > 0 ? parsed.segments[parsed.segments.length - 1] : undefined;
  // Equivalent: kc.q.face().and(kc.q.withFeatureName(owner)).and(kc.q.withLabel(last))
  let candidates = collectAllOfKind('face', scene, originatingQuery);
  if (parsed.owner) {
    // Match owner against the lineage's `featureName` first (the agent-chosen
    // name when `kc.id(...)` pinned the op), falling back to `rootFeatureId`
    // for unpinned ops where the lineage carries no featureName. The owner
    // segment of a formatted ref defaults to rootFeatureId in that case (see
    // buildFaceEntity), so the round-trip stays consistent.
    candidates = candidates.filter((e) => entityHasFeatureNameOrRootId(e, parsed.owner, scene));
  }
  if (labelOrName) {
    candidates = candidates.filter((e) => entityHasLabel(e, labelOrName, scene));
  }
  return candidates;
}

function entityHasFeatureNameOrRootId(
  e: ResolvedEntity,
  owner: string,
  scene: QueryScene,
): boolean {
  if (e.kind !== 'face') return false;
  const lineage = scene.backend.historyMap?.get(e.handle as FaceHash);
  if (!lineage) return false;
  return lineage.featureName === owner || lineage.rootFeatureId === owner;
}

function topoKindToQueryKind(kind: string): QueryKind | null {
  switch (kind) {
    case 'face':
    case 'edge':
    case 'vertex':
    case 'connector':
    case 'part':
    case 'solid':
      return kind;
    case 'sketch':
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Strings-as-sugar (public): accept either an `@kc[...]` ref string or an
// already-built Query value, and return the same internal Query value.
// Mirrors the spec's D0.1 (c) decision.
// ---------------------------------------------------------------------------

import { q as qNs } from './queryConstructors';

export function parseAnyTopologyInput<T = unknown>(
  input: string | Query<T>,
): Query<T> {
  if (typeof input === 'string') {
    return qNs.fromString(input) as unknown as Query<T>;
  }
  return input;
}

// ---------------------------------------------------------------------------
// Entity-construction helpers.
// ---------------------------------------------------------------------------

function buildFaceEntity(hash: FaceHash, lineage: FaceLineage): ResolvedEntity {
  const owner = lineage.featureName ?? lineage.rootFeatureId;
  const refName = lineage.labelName ?? lineage.canonicalName ?? hash.slice(0, 8);
  const ref = formatTopoRef({ owner, kind: 'face', segments: [refName] });
  return {
    kind: 'face',
    ref,
    handle: hash,
    snapshot: lineage.snapshot
      ? {
          centroid: lineage.snapshot.centroid,
          normal: lineage.snapshot.normal,
          area: lineage.snapshot.area,
        }
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Canonical ordering (D0.5 (a)): sort by ref string for determinism.
// Spatial filters override this via filterClosestTo's distance sort.
// ---------------------------------------------------------------------------

function sortCanonical(entities: ResolvedEntity[]): ResolvedEntity[] {
  return [...entities].sort((a, b) => (a.ref < b.ref ? -1 : a.ref > b.ref ? 1 : 0));
}

// ---------------------------------------------------------------------------
// Lenient-mode helper.
// ---------------------------------------------------------------------------

function isQueryDiagnostic(e: unknown): boolean {
  if (e === null || typeof e !== 'object') return false;
  const code = (e as { code?: unknown }).code;
  return typeof code === 'string' && code.startsWith('query.');
}

/** Strict-mode set-algebra failure wrap (D0.16 (c) / Q4). Extracts the
 *  inner diagnostic's code + message and rethrows under
 *  `query.composition-strict-failure` so agents see one named class for
 *  every composition failure mode regardless of which sub-query broke. */
function throwCompositionStrictFailure(
  outerQuery: Query<unknown>,
  scene: QueryScene,
  innerError: unknown,
): never {
  const code = (innerError as { code?: string })?.code ?? 'unknown';
  const message = innerError instanceof Error
    ? innerError.message
    : String(innerError);
  throwQueryCompositionStrictFailure(outerQuery, scene, code, message);
}

// ---------------------------------------------------------------------------
// Side-effect: install the evaluator delegates on the Query module so the
// chainable `.evaluate()` / `.evaluateUnique()` methods can dispatch back
// here. The indirection breaks the cycle (query → evaluator → constructors
// → query): by the time this runs, the constructors module has finished
// initialising and `makeQuery` is available.
// ---------------------------------------------------------------------------

__installEvaluatorDelegates({
  evaluate: <T,>(query: Query<T>, scene: QueryScene) => evaluate(query, scene),
  evaluateUnique: <T,>(query: Query<T>, scene: QueryScene) => evaluateUnique(query, scene),
});
