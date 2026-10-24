// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Build a standard part in memory at the requested detail. The browser has
// no host filesystem, so this is its only door; on the host it is also the
// door for 'full' detail (the bundled catalog STEPs hold the envelopes).
// Geometry comes from fastenerGeometry.ts, the builder the catalog generator
// uses too.

import { initOcct } from '../../kernel/backends/occt/occtBackend';
import type { Shape } from '../capture/proxy';
import type { CaptureSession } from '../capture/captureSession';
import { snapshotCatalogPart, type PartRecord } from '../../shared/parts/types';
import { isFixtureKind, type FastenerDetail, type ResolvedPart } from './familyTable';
import { cachedFastenerSolid, threadFormFor } from './fastenerGeometry';

export interface EnvelopeCtx {
  session: CaptureSession;
}

function envelopeDigest(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(text.length - 1 - i), 0x811c9dc5);
  }
  let out = '';
  for (let i = 0; i < 8; i++) {
    a = Math.imul(a ^ (b >>> (i % 16)), 0x01000193);
    b = Math.imul(b ^ (a >>> (i % 13)), 0x811c9dc5);
    out += (a >>> 0).toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
}

/** Fixture envelopes carry their own dimensions; fold them into the digest so
 *  two different fixture geometries cannot hash alike. */
function dimsKey(part: ResolvedPart): string {
  if (part.dims === undefined) return '';
  return Object.entries(part.dims)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join(',');
}

/** Whether `detail` changes this part's solid (fixtures and flat washers are
 *  the same at both levels). */
function hasDetail(part: ResolvedPart): boolean {
  return !isFixtureKind(part.kind) && part.family !== 'flat-washer';
}

function detailAttributes(part: ResolvedPart, detail: FastenerDetail): Record<string, string | number> {
  if (!hasDetail(part)) return {};
  const form = detail === 'full' ? threadFormFor(part) : 'none';
  return {
    detail,
    ...(part.iso ? { pitchMm: part.iso.pitchMm } : {}),
    ...(part.iso?.threadLengthMm !== undefined ? { threadLengthMm: part.iso.threadLengthMm } : {}),
    ...(form !== 'none' ? { threadForm: form } : {}),
  };
}

export async function synthesizeEnvelope(
  ctx: EnvelopeCtx,
  part: ResolvedPart,
  detail: FastenerDetail = 'full',
): Promise<Shape> {
  await initOcct();
  const effective: FastenerDetail = hasDetail(part) ? detail : 'envelope';
  const backend = cachedFastenerSolid(part, effective);
  // Every fit / clash / installation check measures the nominal envelope.
  if (effective === 'full') backend.analysisBody = cachedFastenerSolid(part, 'envelope');
  const dims = dimsKey(part);
  const digest = envelopeDigest(
    `${part.id}|${part.headDiameterMm}|${part.headHeightMm}|${part.lengthMm}${dims === '' ? '' : `|${dims}`}${effective === 'full' ? '|full' : ''}`,
  );
  const record: PartRecord = {
    id: part.id,
    name: part.name,
    category: part.category,
    family: part.family,
    standard: part.standard,
    tags: part.tags,
    attributes: {
      thread: part.thread,
      ...(part.lengthMm > 0 ? { lengthMm: part.lengthMm } : {}),
      nominalMm: part.nominalMm,
      ...(part.dims ?? {}),
      ...detailAttributes(part, effective),
    },
    sha256: digest,
    source: 'local-catalog',
    license: 'MIT',
    connectors: part.connectors.map((connector) => connector.name),
    connectorManifest: {
      schemaVersion: 1,
      partId: part.id,
      family: part.family,
      geometrySha256: digest,
      connectors: part.connectors,
    },
  };
  const shape = ctx.session.createShape({
    kind: 'importedStep',
    params: {},
    inputs: {},
    metadata: { sourcePath: `envelope:${part.id}${effective === 'full' ? ':full' : ''}` },
  });
  ctx.session.importedGeometry.set(shape.id, backend);
  ctx.session.attachCatalogConnectors(shape.id, part.connectors);
  const feature = ctx.session.getRecords().find((candidate) => candidate.id === shape.id);
  if (feature) {
    feature.metadata = {
      ...(feature.metadata ?? {}),
      catalogPart: snapshotCatalogPart(record),
    };
  }
  return shape;
}
