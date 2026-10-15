// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { SessionPool, SessionPoolEntry } from '../sessionPool';
import { readBody, readQuery, writeJson, type MinimalRes } from './httpUtil';
import { faceSignatureSchema, sharedSelectionSchema } from '../../shared/selection/sharedSelection';
import { remapFaceSignature, signatureForSelection } from '../../shared/selection/faceSignature';
import type { FaceSignature, SharedSelection } from '../../shared/selection/sharedSelection';
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
async function updateSelection(
  pool: SessionPool, entry: SessionPoolEntry, req: NodeJS.ReadableStream,
  resolver?: (entry: SessionPoolEntry, selection: SharedSelection) => Promise<CurrentFaceVerification>,
): Promise<SelectionUpdateError | null> {
  const body = JSON.parse(await readBody(req, 4096));
  const parsed = sharedSelectionSchema.safeParse(body.selection);
  if (!parsed.success) return { status: 400, message: 'invalid selection' };
  const acceptedGeneration = entry.selectionModelGeneration;
  if (body.model_generation !== acceptedGeneration) return generationConflict();
  const signatureResult = parseSuppliedSignature(body.face_signature);
  if (!signatureResult.valid) return { status: 400, message: 'invalid face signature' };
  // Keep generation validation and every selection write under the same lock
  // used by rebuilds. Face verification must stay unlocked to avoid nesting.
  return pool.runExclusive(async () => {
    if (body.model_generation !== entry.selectionModelGeneration || acceptedGeneration !== entry.selectionModelGeneration) return generationConflict();
    if (parsed.data?.kind === 'face') {
      const verification = await (resolver ? resolver(entry, parsed.data!) : verifyCurrentFaceUnlocked(entry, parsed.data!));
      if (body.model_generation !== entry.selectionModelGeneration || acceptedGeneration !== entry.selectionModelGeneration) return generationConflict();
      if (!verification.signature || (signatureResult.signature && !sameFaceSignature(signatureResult.signature, verification.signature))) {
        return { status: 409, message: 'face signature does not match the current mesh' };
      }
      if (entry.selectionPendingSignature && !sameSelection(parsed.data!, verification.remappedSelection)) {
        return { status: 409, message: 'selection pending rebuild; Studio must publish the unique verified remap' };
      }
      entry.selection = parsed.data;
      entry.selectionFaceSignature = signatureResult.signature ?? verification.signature;
      entry.selectionPendingSignature = null;
      entry.selectionRevision += 1;
      return null;
    }
    entry.selection = parsed.data;
    entry.selectionFaceSignature = null;
    entry.selectionPendingSignature = null;
    entry.selectionRevision += 1;
    return null;
  });
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
  return { ok: true, selection: entry.selection, revision: entry.selectionRevision, modelGeneration: entry.selectionModelGeneration,
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
