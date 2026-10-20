// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SessionPool, SessionPoolEntry } from '../sessionPool';
import { readBody, readQuery, writeJson, type MinimalRes } from './httpUtil';
import { faceSignatureSchema, sharedSelectionItemSchema, sharedSelectionSchema } from '../../shared/selection/sharedSelection';
import { remapFaceSignature, signatureForSelection } from '../../shared/selection/faceSignature';
import type { FaceSignature, SharedSelection, SharedSelectionItem } from '../../shared/selection/sharedSelection';
import type { GeometryResult } from '../../shared/worker/workerTypes';

interface CurrentFaceVerification { signature: FaceSignature | null; remappedSelection: SharedSelection; }

/** Local dev route. Hosted consumers must authorize session ownership before calling. */
export function createSelectionEndpoint({ pool, resolveFaceSignature }: {
  pool: SessionPool;
  resolveFaceSignature?: (entry: SessionPoolEntry, selection: SharedSelection) => Promise<CurrentFaceVerification>;
}) {
  return async (req: NodeJS.ReadableStream & { url?: string; method?: string }, res: MinimalRes): Promise<void> => {
    try {
      const entry = getEntry(pool, req.url, res);
      if (!entry) return;
      if (req.method !== 'GET' && req.method !== 'POST') return writeJson(res, 405, { ok: false, error: 'use GET or POST' });
      if (req.method === 'POST') {
        const updateError = await updateSelection(pool, entry, req, resolveFaceSignature);
        if (updateError) return writeJson(res, updateError.status, selectionError(entry, updateError.message));
      }
      return writeJson(res, 200, selectionResponse(entry, req.url));
    } catch (error) {
      return writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : 'invalid selection JSON' });
    }
  };
}

function getEntry(pool: SessionPool, url: string | undefined, res: MinimalRes): SessionPoolEntry | null {
  const token = readQuery(url, 'session');
  if (!token) { writeJson(res, 400, { ok: false, error: 'missing session query parameter' }); return null; }
  const entry = pool.get(token);
  if (!entry) writeJson(res, 404, { ok: false, error: 'session not found' });
  return entry ?? null;
}

interface SelectionUpdateError { status: number; message: string; }
interface ParsedSelectionUpdate {
  modelGeneration: unknown;
  selection: SharedSelection;
  selections: SharedSelectionItem[];
  faceSignature: FaceSignature | null;
}

async function updateSelection(
  pool: SessionPool, entry: SessionPoolEntry, req: NodeJS.ReadableStream,
  resolver?: (entry: SessionPoolEntry, selection: SharedSelection) => Promise<CurrentFaceVerification>,
): Promise<SelectionUpdateError | null> {
  const body = JSON.parse(await readBody(req, 4096)) as Record<string, unknown>;
  const parsed = parseSelectionUpdate(body);
  if ('status' in parsed) return parsed;
  const { modelGeneration, selection, selections, faceSignature } = parsed;
  const acceptedGeneration = entry.selectionModelGeneration;
  if (modelGeneration !== acceptedGeneration) return generationConflict();

  // Keep generation validation and every selection write under the same lock
  // used by rebuilds. Face verification must stay unlocked to avoid nesting.
  return pool.runExclusive(() => commitSelectionUpdate(
    entry, modelGeneration, acceptedGeneration, selection, selections, faceSignature, resolver,
  ));
}

function parseSelectionUpdate(body: Record<string, unknown>): ParsedSelectionUpdate | SelectionUpdateError {
  const parsed = sharedSelectionSchema.safeParse(body.selection);
  if (!parsed.success) return { status: 400, message: 'invalid selection' };
  const parsedSelections = body.selections === undefined
    ? { success: true as const, data: parsed.data ? [parsed.data] : [] }
    : zSelectionArray(body.selections);
  if (!parsedSelections.success) return { status: 400, message: 'invalid selections' };
  const signatureResult = parseSuppliedSignature(body.face_signature);
  if (!signatureResult.valid) return { status: 400, message: 'invalid face signature' };
  return {
    modelGeneration: body.model_generation,
    selection: parsed.data,
    selections: parsedSelections.data,
    faceSignature: signatureResult.signature,
  };
}

async function commitSelectionUpdate(
  entry: SessionPoolEntry,
  modelGeneration: unknown,
  acceptedGeneration: number,
  selection: SharedSelection,
  selections: SharedSelectionItem[],
  faceSignature: FaceSignature | null,
  resolver?: (entry: SessionPoolEntry, selection: SharedSelection) => Promise<CurrentFaceVerification>,
): Promise<SelectionUpdateError | null> {
  if (isStaleGeneration(entry, modelGeneration, acceptedGeneration)) return generationConflict();
  const meshError = await validateCurrentSelections(entry, selections, modelGeneration, acceptedGeneration);
  if (meshError) return meshError;
  if (selection?.kind === 'face') {
    return saveVerifiedFaceSelection(entry, modelGeneration, acceptedGeneration, selection, selections, faceSignature, resolver);
  }
  saveSelection(entry, selection, selections, null);
  return null;
}

function isStaleGeneration(entry: SessionPoolEntry, modelGeneration: unknown, acceptedGeneration: number): boolean {
  return modelGeneration !== entry.selectionModelGeneration || acceptedGeneration !== entry.selectionModelGeneration;
}

async function validateCurrentSelections(
  entry: SessionPoolEntry,
  selections: SharedSelectionItem[],
  modelGeneration: unknown,
  acceptedGeneration: number,
): Promise<SelectionUpdateError | null> {
  if (!selections.some(selected => selected.kind === 'edge' && selected.stableId)) return null;
  const geometries = await currentSelectionGeometries(entry);
  if (isStaleGeneration(entry, modelGeneration, acceptedGeneration)) return generationConflict();
  for (const selected of selections) {
    const geometry = geometries[selected.shapeIndex];
    if (!geometry) return { status: 409, message: 'selection does not match the current mesh' };
    const error = validateMeshSelection(selected, geometry);
    if (error) return error;
  }
  return null;
}

function validateMeshSelection(
  selected: SharedSelectionItem,
  geometry: GeometryResult,
): SelectionUpdateError | null {
  if (selected.kind === 'face') {
    return geometry.faces.some(face => face.faceId === selected.id)
      ? null : { status: 409, message: 'selection does not match the current mesh' };
  }
  return validateMeshEdgeSelection(selected, geometry);
}

function validateMeshEdgeSelection(
  selected: SharedSelectionItem,
  geometry: GeometryResult,
): SelectionUpdateError | null {
  if (!selected.stableId) return null; // legacy mesh-local edge picks remain accepted
  if (geometry.edgeStableIds?.[selected.id] !== selected.stableId) {
    return { status: 409, message: 'edge selection does not match the current mesh' };
  }
  const owner = geometry.edgeOwners?.[selected.id] || geometry.featureId || null;
  const expectedRef = geometry.featureId ? `@kc[${geometry.featureId}/edge/${selected.stableId}]` : undefined;
  return selected.featureId === owner && (selected.ref === undefined || selected.ref === expectedRef)
    ? null : { status: 409, message: 'edge reference does not match the current mesh' };
}

async function saveVerifiedFaceSelection(
  entry: SessionPoolEntry,
  modelGeneration: unknown,
  acceptedGeneration: number,
  selection: SharedSelectionItem,
  selections: SharedSelectionItem[],
  faceSignature: FaceSignature | null,
  resolver?: (entry: SessionPoolEntry, selection: SharedSelection) => Promise<CurrentFaceVerification>,
): Promise<SelectionUpdateError | null> {
  const verification = await (resolver ? resolver(entry, selection) : verifyCurrentFaceUnlocked(entry, selection));
  if (isStaleGeneration(entry, modelGeneration, acceptedGeneration)) return generationConflict();
  if (!verification.signature || (faceSignature && !sameFaceSignature(faceSignature, verification.signature))) {
    return { status: 409, message: 'face signature does not match the current mesh' };
  }
  if (entry.selectionPendingSignature && !sameSelection(selection, verification.remappedSelection)) {
    return { status: 409, message: 'selection pending rebuild; Studio must publish the unique verified remap' };
  }
  saveSelection(entry, selection, selections, faceSignature ?? verification.signature);
  return null;
}

function saveSelection(
  entry: SessionPoolEntry,
  selection: SharedSelection,
  selections: SharedSelectionItem[],
  faceSignature: FaceSignature | null,
): void {
  entry.selection = selection;
  entry.selections = selections;
  entry.selectionFaceSignature = faceSignature;
  entry.selectionPendingSignature = null;
  entry.selectionRevision += 1;
}

function zSelectionArray(value: unknown) {
  return Array.isArray(value) && value.every(item => sharedSelectionItemSchema.safeParse(item).success)
    ? { success: true as const, data: value as Exclude<SharedSelection, null>[] }
    : { success: false as const };
}

async function currentSelectionGeometries(entry: SessionPoolEntry): Promise<GeometryResult[]> {
  const { meshFeaturesPerFeature } = await import('../../modeling/capture/featureMeshing');
  const result = await meshFeaturesPerFeature(entry.model.records, entry.model.session.paramTable, entry.model.session);
  return result.features.map(feature => ({
    featureId: feature.featureId,
    faces: feature.faces,
    faceOwners: feature.faceOwners,
    edgeRanges: feature.edgeRanges,
    edgeOwners: feature.edgeOwners,
    edgeStableIds: feature.edgeStableIds,
  })) as GeometryResult[];
}

async function verifyCurrentFaceUnlocked(entry: SessionPoolEntry, selection: SharedSelection): Promise<CurrentFaceVerification> {
  const { meshFeaturesPerFeature } = await import('../../modeling/capture/featureMeshing');
  const result = await meshFeaturesPerFeature(entry.model.records, entry.model.session.paramTable, entry.model.session);
  const geometries = result.features.map(feature => ({ featureId: feature.featureId, faces: feature.faces, faceOwners: feature.faceOwners })) as GeometryResult[];
  return {
    signature: signatureForSelection(geometries, selection),
    remappedSelection: entry.selectionPendingSignature ? remapFaceSignature(geometries, entry.selectionPendingSignature) : selection,
  };
}

function generationConflict(): SelectionUpdateError {
  return { status: 409, message: 'model generation changed; read selection again' };
}

function parseSuppliedSignature(value: unknown): { valid: boolean; signature: FaceSignature | null } {
  if (value == null) return { valid: true, signature: null };
  const parsed = faceSignatureSchema.safeParse(value);
  return parsed.success ? { valid: true, signature: parsed.data } : { valid: false, signature: null };
}

function selectionError(entry: SessionPoolEntry, message: string) {
  const result = { ok: false, error: message } as Record<string, unknown>;
  if (message === 'model generation changed; read selection again') {
    Object.assign(result, { selection: entry.selection, revision: entry.selectionRevision, modelGeneration: entry.selectionModelGeneration });
  } else if (message.includes('current mesh') || message.includes('unique verified')) {
    Object.assign(result, { selection: null, revision: entry.selectionRevision, modelGeneration: entry.selectionModelGeneration });
  }
  return result;
}

function selectionResponse(entry: SessionPoolEntry, url: string | undefined) {
  const studioRemap = readQuery(url, 'studio_remap') === '1';
  return { ok: true, selection: entry.selection, selections: entry.selections, revision: entry.selectionRevision, modelGeneration: entry.selectionModelGeneration,
    ...(entry.selectionPendingSignature && !studioRemap ? { error: 'selection pending rebuild' } : {}),
    ...(studioRemap ? { pendingSignature: entry.selectionPendingSignature } : {}) };
}

function sameSelection(a: SharedSelection, b: SharedSelection): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameFaceSignature(a: FaceSignature, b: FaceSignature): boolean {
  const close = (x: number, y: number) => Math.abs(x - y) <= Math.max(1e-6, Math.abs(y) * 1e-6);
  return a.owner === b.owner && a.surface === b.surface && close(a.area, b.area)
    && a.centroid.every((value, index) => close(value, b.centroid[index]!))
    && a.bounds.every((value, index) => close(value, b.bounds[index]!))
    && ((!a.normal && !b.normal) || (!!a.normal && !!b.normal && a.normal.every((value, index) => close(value, b.normal![index]!))));
}
