// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Build a fastener envelope in memory. Used when the generated STEP file is
// not on disk, and by the browser, which has no host filesystem.

import { OcctBackend, initOcct } from '../../kernel/backends/occt/occtBackend';
import type { Shape } from '../capture/proxy';
import type { CaptureSession } from '../capture/captureSession';
import { snapshotCatalogPart, type PartRecord } from '../../shared/parts/types';
import { isFixtureKind, type ResolvedPart } from './familyTable';
import { fixtureSolid } from './fixtureSolids';

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

function screwSolid(part: ResolvedPart): OcctBackend {
  const head = OcctBackend.cylinder(part.headHeightMm, part.headDiameterMm / 2);
  const shank = OcctBackend.cylinder(part.lengthMm, part.nominalMm / 2).translate(0, 0, -part.lengthMm);
  return head.union(shank);
}

function washerSolid(part: ResolvedPart): OcctBackend {
  const outer = OcctBackend.cylinder(part.headHeightMm, part.headDiameterMm / 2);
  const inner = OcctBackend.cylinder(part.headHeightMm, part.innerDiameterMm / 2);
  return outer.subtract(inner);
}

function nutSolid(part: ResolvedPart): OcctBackend {
  const radius = part.acrossFlatsMm / Math.sqrt(3);
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    pts.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  const prism = OcctBackend.extrudePolygon(pts, part.headHeightMm);
  const bore = OcctBackend.cylinder(part.headHeightMm, part.nominalMm / 2);
  return prism.subtract(bore);
}

function solidFor(part: ResolvedPart): OcctBackend {
  if (isFixtureKind(part.kind)) return fixtureSolid(part.kind, part.dims ?? {}, part.nominalMm);
  if (part.kind === 'washer') return washerSolid(part);
  if (part.kind === 'nut') return nutSolid(part);
  return screwSolid(part);
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

export async function synthesizeEnvelope(ctx: EnvelopeCtx, part: ResolvedPart): Promise<Shape> {
  await initOcct();
  const backend = solidFor(part);
  const dims = dimsKey(part);
  const digest = envelopeDigest(
    `${part.id}|${part.headDiameterMm}|${part.headHeightMm}|${part.lengthMm}${dims === '' ? '' : `|${dims}`}`,
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
    metadata: { sourcePath: `envelope:${part.id}` },
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
