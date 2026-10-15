// SPDX-License-Identifier: MIT
// Imported geometry remains CC-BY-SA-4.0; see assets/reference-parts/sg90/README.md.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as replicad from 'replicad';
import { OcctBackend, initOcct } from '../src/kernel/backends/occt/occtBackend';
import type { SeedFamily } from './generateSeedCatalog';
import type { ConnectorEntry } from '../src/shared/parts/connectorManifest';
import type { PartRecord } from '../src/shared/parts/types';

export const SG90_UPSTREAM_COMMIT = 'f5ca01cdcaa2f69b9295a6382719c2d90628780c';
const upstreamRepo = 'https://github.com/FreeCAD/FreeCAD-library';
const upstreamDir = 'Electrical Parts/Servos/SG-90';
const attribution = 'Juan Fenoy, FreeCAD community parts library; CC-BY-SA-4.0. Translated to shaft-centered coordinates by kernelCAD contributors.';
const referenceStatus = 'community reference; exact Modulshop variant unverified';
const axis = (name: string, origin: [number, number, number]): ConnectorEntry => ({ name, type: 'axis', origin, axis: [0, 0, 1] });
const face = (name: string, origin: [number, number, number], normal: [number, number, number]): ConnectorEntry => ({ name, type: 'frame', origin, normal });

export interface Sg90Part {
  family: 'micro-servo' | 'servo-horn';
  id: 'sg90-servo' | 'sg90-horn-single-arm';
  /** Upstream file name at SG90_UPSTREAM_COMMIT. */
  upstreamFile: string;
  /** Translation applied to the upstream STEP. Nothing else changes. */
  translate: [number, number, number];
  connectors: ConnectorEntry[];
  record: Omit<PartRecord, 'sha256' | 'source'>;
}

/** Connector positions are measured on the imported STEP
 * (scripts/sg90Catalog.test.ts checks them against detected holes). */
export const SG90_PARTS: Sg90Part[] = [
  {
    family: 'micro-servo', id: 'sg90-servo', upstreamFile: 'Servo-sg90.step', translate: [0, -16.6, 0],
    connectors: [
      axis('shaft-output', [0, 0, 29.9]),
      face('ear-mount-low', [0, -18.95, 15.9], [0, 0, -1]),
      face('ear-mount-high', [0, 8.25, 15.9], [0, 0, -1]),
    ],
    record: {
      id: 'sg90-servo', name: 'SG90 9g micro servo (community reference)', family: 'micro-servo', category: 'motor',
      tags: ['sg90', 'SG-90', 'servo', 'motor', 'community-reference'],
      attributes: { referenceStatus, bodyWidthMm: 11.8, bodyLengthMm: 22.5, bodyHeightMm: 22.7, overallHeightMm: 29.9, mountHoleDiameterMm: 2, earThicknessMm: 2.5, mountHoleSpacingMm: 27.2 },
      connectors: ['shaft-output', 'ear-mount-low', 'ear-mount-high'],
      license: 'CC-BY-SA-4.0', attribution, licenseClass: 'share-alike', redistribution: 'mirror',
      upstream: { repo: upstreamRepo, commit: SG90_UPSTREAM_COMMIT, path: `${upstreamDir}/Servo-sg90.step` },
    },
  },
  {
    family: 'servo-horn', id: 'sg90-horn-single-arm', upstreamFile: 'SG90-1-arm-horn.step', translate: [-26.9697124226, -36.3361995732, -25.6721712781],
    connectors: [
      face('horn-face', [0, 0, 0], [0, 0, -1]),
      face('spline-socket', [0, 0, 5], [0, 0, 1]),
      axis('shaft-axis', [0, 0, 0]),
      ...[5, 7, 9, 11, 13, 15, 17].map(x => axis(`mount-hole-${x}`, [x, 0, 0])),
    ],
    record: {
      id: 'sg90-horn-single-arm', name: 'SG90 single arm horn (community reference)', family: 'servo-horn', category: 'mechanical',
      tags: ['sg90', 'SG-90', 'servo', 'horn', 'community-reference'],
      attributes: { referenceStatus, faceplateThicknessMm: 2, mountHoleDiameterMm: 1.4, mountHolePitchMm: 2, firstHoleOffsetMm: 5, lastHoleOffsetMm: 17, coreHoleDiameterMm: 2, recessDiameterMm: 5, socketDiameterMm: 6, overallHeightMm: 5, socketExtensionMm: 3, socketOpeningZMm: 5 },
      connectors: ['horn-face', 'spline-socket', 'shaft-axis', ...[5, 7, 9, 11, 13, 15, 17].map(x => `mount-hole-${x}`)],
      license: 'CC-BY-SA-4.0', attribution, licenseClass: 'share-alike', redistribution: 'mirror',
      upstream: { repo: upstreamRepo, commit: SG90_UPSTREAM_COMMIT, path: `${upstreamDir}/SG90-1-arm-horn.step` },
    },
  },
];

export function sg90UpstreamUrl(part: Sg90Part): string {
  return `https://raw.githubusercontent.com/FreeCAD/FreeCAD-library/${SG90_UPSTREAM_COMMIT}/${encodeURI(`${upstreamDir}/${part.upstreamFile}`)}`;
}

/** Import the upstream STEP and translate it. The shaft points +Z and the
 * motor bottom stays at Z=0. Used by scripts/refreshSg90Seed.ts. */
export async function normalizeSg90(part: Sg90Part, upstreamStep: Uint8Array): Promise<Uint8Array> {
  await initOcct();
  const imported = await replicad.importSTEP(new Blob([new Uint8Array(upstreamStep)]));
  const shape = new OcctBackend(imported as ConstructorParameters<typeof OcctBackend>[0]);
  return new Uint8Array(await shape.translate(...part.translate).exportSTEPAsync());
}

export function sg90SeedStepUrl(part: Sg90Part): URL {
  return new URL(`../assets/parts-seed/${part.family}/${part.id}.step`, import.meta.url);
}

/** Genuine imported geometry, never envelope stand-ins. The catalog copies the
 * committed normalized STEP from assets/parts-seed, so `generate:parts` does
 * not re-import the 1.5 MB upstream file on every test run. */
export function sg90Families(): SeedFamily[] {
  return SG90_PARTS.map((part): SeedFamily => ({
    id: part.family, category: part.record.category, variants: [{}],
    async generate() {
      const stepBytes = new Uint8Array(readFileSync(fileURLToPath(sg90SeedStepUrl(part))));
      return { stepBytes, connectors: part.connectors, record: part.record };
    },
  }));
}
