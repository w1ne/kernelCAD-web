// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Deployment gate for required authored electronics. The electronics ingest is
// intentionally tolerant of a bad third-party upstream model, but the five
// authored IC packages and the A4988/SG90 universal components must never
// silently disappear from a deployed catalog. Validate both sides of that
// contract: source-level package semantics and emitted catalog artifacts.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FeatureRecord } from '../src/shared/intent/featureRecord';
import {
  validateHashBoundConnectorManifest,
  type HashBoundConnectorManifest,
} from '../src/shared/parts/connectorManifestSchema';
import { runScript } from '../src/modeling/runtime/runScript';

type Axis = 0 | 1 | 2;

interface ContactRunSpec {
  readonly names: readonly string[];
  readonly axis: Axis;
  readonly pitchMm: number;
  /** The package extent on the run axis. The first and last contacts must
   * mirror around its centre, preventing an accidentally edge-biased array. */
  readonly symmetricSpanMm: number;
}

interface UndersideContactSpec {
  /** The non-contact package solid that must sit above the solder interface. */
  readonly bodyName: string;
  /** Contacts on the package underside. Their top faces may meet, but never
   * overlap, the package body. */
  readonly contactNames: readonly string[];
}

export interface AuthoredElectronicPackageSpec {
  readonly id: string;
  /** Published, two-decimal measured bbox expected after STEP ingest. */
  readonly bboxMm: readonly [number, number, number];
  readonly package: string;
  readonly pinCount: number;
  readonly pinPitchMm?: number;
  readonly componentNames: readonly string[];
  readonly contactNames: readonly string[];
  readonly contactRuns: readonly ContactRunSpec[];
  readonly undersideContacts?: UndersideContactSpec;
}

const numbered = (prefix: string, count: number): readonly string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}${String(index + 1).padStart(2, '0')}`);

const nrfContacts = [
  ...numbered('contact-left-', 12),
  ...numbered('contact-right-', 12),
  ...numbered('contact-bottom-', 12),
  ...numbered('contact-top-', 12),
] as const;

const maxContacts = [
  ...numbered('contact-bottom-', 7),
  ...numbered('contact-top-', 7),
] as const;

const bmiContacts = numbered('contact-', 14);
const tmpContacts = Array.from({ length: 6 }, (_, index) => `ball-${index + 1}`);
const drvContacts = Array.from({ length: 9 }, (_, index) => `ball-${index + 1}`);

/**
 * One deliberate list for both the deploy gate and its fixture tests. These
 * are reusable package-level parts — no project-specific board geometry.
 */
export const AUTHORED_ELECTRONIC_PACKAGE_SPECS: readonly AuthoredElectronicPackageSpec[] = [
  {
    id: 'nrf54l15-qfn48',
    bboxMm: [6, 6, 0.85],
    package: 'QFN48 (QFAA)',
    pinCount: 48,
    pinPitchMm: 0.4,
    componentNames: ['package-body', 'exposed-pad', 'pin-1-marker'],
    contactNames: nrfContacts,
    contactRuns: [
      { names: numbered('contact-bottom-', 12), axis: 0, pitchMm: 0.4, symmetricSpanMm: 6 },
      { names: numbered('contact-top-', 12), axis: 0, pitchMm: 0.4, symmetricSpanMm: 6 },
      { names: numbered('contact-left-', 12), axis: 1, pitchMm: 0.4, symmetricSpanMm: 6 },
      { names: numbered('contact-right-', 12), axis: 1, pitchMm: 0.4, symmetricSpanMm: 6 },
    ],
  },
  {
    id: 'bmi270-lga14',
    bboxMm: [3, 2.5, 0.83],
    package: 'LGA-14',
    pinCount: 14,
    pinPitchMm: 0.4,
    componentNames: ['package-body', 'pin-1-marker'],
    contactNames: bmiContacts,
    contactRuns: [
      { names: numbered('contact-', 7), axis: 0, pitchMm: 0.4, symmetricSpanMm: 3 },
      { names: numbered('contact-', 7).map((name, index) => `contact-${String(index + 8).padStart(2, '0')}`), axis: 0, pitchMm: 0.4, symmetricSpanMm: 3 },
      { names: ['contact-01', 'contact-08'], axis: 1, pitchMm: 1.9, symmetricSpanMm: 2.5 },
    ],
  },
  {
    id: 'max30102-optical',
    bboxMm: [5.6, 3.3, 1.55],
    package: 'optical module',
    pinCount: 14,
    pinPitchMm: 0.8,
    componentNames: [
      'package-body',
      'cover-glass',
      'red-led-window',
      'ir-led-window',
      'photodiode-window',
      'pin-1-marker',
    ],
    contactNames: maxContacts,
    contactRuns: [
      { names: numbered('contact-bottom-', 7), axis: 0, pitchMm: 0.8, symmetricSpanMm: 5.6 },
      { names: numbered('contact-top-', 7), axis: 0, pitchMm: 0.8, symmetricSpanMm: 5.6 },
    ],
    undersideContacts: { bodyName: 'package-body', contactNames: maxContacts },
  },
  {
    id: 'tmp117-dsbga',
    bboxMm: [1.49, 0.95, 0.53],
    package: 'DSBGA-6 (YBG)',
    pinCount: 6,
    pinPitchMm: 0.4,
    componentNames: ['package-die', 'pin-1-marker'],
    contactNames: tmpContacts,
    contactRuns: [
      { names: ['ball-1', 'ball-2', 'ball-3'], axis: 0, pitchMm: 0.4, symmetricSpanMm: 1.488 },
      { names: ['ball-4', 'ball-5', 'ball-6'], axis: 0, pitchMm: 0.4, symmetricSpanMm: 1.488 },
      { names: ['ball-1', 'ball-4'], axis: 1, pitchMm: 0.4, symmetricSpanMm: 0.95 },
    ],
  },
  {
    id: 'drv2605-yzf',
    bboxMm: [1.44, 1.44, 0.63],
    package: 'DSBGA-9 (YZF)',
    pinCount: 9,
    pinPitchMm: 0.5,
    componentNames: ['package-die', 'pin-1-marker'],
    contactNames: drvContacts,
    contactRuns: [
      { names: ['ball-1', 'ball-2', 'ball-3'], axis: 0, pitchMm: 0.5, symmetricSpanMm: 1.44 },
      { names: ['ball-4', 'ball-5', 'ball-6'], axis: 0, pitchMm: 0.5, symmetricSpanMm: 1.44 },
      { names: ['ball-1', 'ball-4', 'ball-7'], axis: 1, pitchMm: 0.5, symmetricSpanMm: 1.44 },
    ],
  },
];

/**
 * These universal components are consumed by projects, rather than being
 * package-only primitives. Their exported STEP and exact authored interfaces
 * are therefore required deployment artifacts, not best-effort additions.
 */
export interface RequiredAuthoredCatalogComponentSpec {
  readonly id: string;
  readonly family: string;
  readonly source: string;
  readonly connectors: readonly RequiredAuthoredCatalogConnectorSpec[];
}

export interface RequiredAuthoredCatalogConnectorSpec {
  readonly name: string;
  readonly type: 'frame' | 'axis';
}

export const REQUIRED_AUTHORED_CATALOG_COMPONENT_SPECS: readonly RequiredAuthoredCatalogComponentSpec[] = [
  {
    id: 'a4988-stepstick-carrier',
    family: 'stepper-driver',
    source: 'scripts/parts/authored/a4988-stepstick-carrier.kcad.ts',
    connectors: [
      'carrier-solder-face',
      'en-contact', 'ms1-contact', 'ms2-contact', 'ms3-contact',
      'reset-contact', 'sleep-contact', 'step-contact', 'dir-contact',
      'vmot-contact', 'gnd-motor-contact', 'motor-2b-contact',
      'motor-2a-contact', 'motor-1a-contact', 'motor-1b-contact',
      'gnd-logic-contact', 'vdd-contact',
    ].map((name) => ({ name, type: 'frame' as const })),
  },
  {
    id: 'sg90-micro-servo',
    family: 'micro-servo',
    source: 'scripts/parts/authored/sg90-micro-servo.kcad.ts',
    connectors: [
      { name: 'ground-contact', type: 'frame' },
      { name: 'vplus-contact', type: 'frame' },
      { name: 'pwm-contact', type: 'frame' },
    ],
  },
];

interface ManifestPart {
  readonly id: string;
  readonly family?: string;
  readonly kcad_source?: string;
  readonly attributes?: Readonly<Record<string, string | number>>;
}

interface CatalogRecordLike {
  readonly id?: unknown;
  readonly family?: unknown;
  readonly attributes?: unknown;
  readonly stepUrl?: unknown;
  readonly sha256?: unknown;
  readonly connectorManifest?: unknown;
}

interface CatalogIndexLike {
  readonly items?: unknown;
}

export interface VerifyAuthoredElectronicsCatalogOptions {
  readonly catalogDir: string;
  readonly manifestPath: string;
}

export interface VerifyAuthoredElectronicsCatalogResult {
  readonly verifiedIds: string[];
}

/**
 * Verify every authored reusable package is present in the generated catalog,
 * has its expected published bounds + package metadata, and still contains
 * named components and solder contacts in its source model.
 *
 * Throws one aggregate error so a failed deploy tells the maintainer every
 * missing/malformed package in a single CI run.
 */
export async function verifyAuthoredElectronicsCatalog(
  options: VerifyAuthoredElectronicsCatalogOptions,
): Promise<VerifyAuthoredElectronicsCatalogResult> {
  const errors: string[] = [];
  const manifest = readJson<{ parts?: unknown }>(options.manifestPath, errors, 'manifest');
  const manifestParts = Array.isArray(manifest?.parts) ? manifest.parts as ManifestPart[] : [];
  if (!Array.isArray(manifest?.parts)) errors.push('manifest: expected a parts array');

  const indexPath = join(options.catalogDir, 'v1', 'catalog', 'parts.index.json');
  const index = readJson<CatalogIndexLike>(indexPath, errors, 'catalog index');
  const indexItems = Array.isArray(index?.items) ? index.items as CatalogRecordLike[] : [];
  if (!Array.isArray(index?.items)) errors.push('catalog index: expected an items array');

  const repoRoot = resolve(dirname(options.manifestPath), '..');
  for (const spec of AUTHORED_ELECTRONIC_PACKAGE_SPECS) {
    const manifestPart = manifestParts.find((part) => part.id === spec.id);
    verifyManifestPart(spec, manifestPart, errors);

    if (manifestPart?.kcad_source) {
      const sourcePath = resolve(repoRoot, manifestPart.kcad_source);
      await verifySourceModel(spec, sourcePath, errors);
    }

    const detailPath = join(options.catalogDir, 'v1', 'parts', `${spec.id}.json`);
    const detail = readJson<CatalogRecordLike>(detailPath, errors, `${spec.id}: detail record`);
    verifyCatalogRecord(spec, detail, detailPath, options.catalogDir, errors);

    const indexed = indexItems.find((record) => record.id === spec.id);
    if (indexed === undefined) {
      errors.push(`${spec.id}: missing from catalog index`);
    } else if (detail !== undefined && indexed.sha256 !== detail.sha256) {
      errors.push(`${spec.id}: catalog index SHA-256 does not match its detail record`);
    }
  }

  for (const spec of REQUIRED_AUTHORED_CATALOG_COMPONENT_SPECS) {
    const manifestPart = manifestParts.find((part) => part.id === spec.id);
    verifyRequiredComponentManifest(spec, manifestPart, errors);

    const detailPath = join(options.catalogDir, 'v1', 'parts', `${spec.id}.json`);
    const detail = readJson<CatalogRecordLike>(detailPath, errors, `${spec.id}: detail record`);
    verifyRequiredComponentRecord(spec, detail, detailPath, options.catalogDir, errors);

    const indexed = indexItems.find((record) => record.id === spec.id);
    if (indexed === undefined) {
      errors.push(`${spec.id}: missing from catalog index`);
    } else if (detail !== undefined && indexed.sha256 !== detail.sha256) {
      errors.push(`${spec.id}: catalog index SHA-256 does not match its detail record`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Authored electronics catalog verification failed:\n- ${errors.join('\n- ')}`);
  }
  return {
    verifiedIds: [
      ...AUTHORED_ELECTRONIC_PACKAGE_SPECS,
      ...REQUIRED_AUTHORED_CATALOG_COMPONENT_SPECS,
    ].map((spec) => spec.id),
  };
}

function verifyManifestPart(
  spec: AuthoredElectronicPackageSpec,
  part: ManifestPart | undefined,
  errors: string[],
): void {
  if (!part) {
    errors.push(`${spec.id}: missing from electronics manifest`);
    return;
  }
  if (part.kcad_source !== `scripts/parts/authored/${spec.id}.kcad.ts`) {
    errors.push(`${spec.id}: must declare its authored package source`);
  }
  const attributes = part.attributes;
  if (attributes?.package !== spec.package) {
    errors.push(`${spec.id}: manifest package metadata is not '${spec.package}'`);
  }
  if (attributes?.pinCount !== spec.pinCount) {
    errors.push(`${spec.id}: manifest pinCount is not ${spec.pinCount}`);
  }
  if (spec.pinPitchMm !== undefined && attributes?.pinPitchMm !== spec.pinPitchMm) {
    errors.push(`${spec.id}: manifest pinPitchMm is not ${spec.pinPitchMm}`);
  }
}

function verifyRequiredComponentManifest(
  spec: RequiredAuthoredCatalogComponentSpec,
  part: ManifestPart | undefined,
  errors: string[],
): void {
  if (!part) {
    errors.push(`${spec.id}: missing from electronics manifest`);
    return;
  }
  if (part.family !== spec.family) {
    errors.push(`${spec.id}: manifest family is not '${spec.family}'`);
  }
  if (part.kcad_source !== spec.source) {
    errors.push(`${spec.id}: must declare authored source '${spec.source}'`);
  }
}

async function verifySourceModel(
  spec: AuthoredElectronicPackageSpec,
  sourcePath: string,
  errors: string[],
): Promise<void> {
  if (!existsSync(sourcePath)) {
    errors.push(`${spec.id}: missing authored source ${sourcePath}`);
    return;
  }

  let records: readonly FeatureRecord[];
  try {
    const source = readFileSync(sourcePath, 'utf8');
    records = (await runScript({
      code: source,
      fileName: sourcePath,
      scriptDir: dirname(sourcePath),
    })).records;
  } catch (error) {
    errors.push(`${spec.id}: authored source did not capture — ${formatError(error)}`);
    return;
  }

  const assemblyParts = records.filter((record) => record.kind === 'assemblyPart');
  const actualNames = assemblyParts
    .map((record) => record.metadata?.partName)
    .filter((name): name is string => typeof name === 'string');
  const expectedNames = [...spec.componentNames, ...spec.contactNames];
  const actualSet = new Set(actualNames);
  const expectedSet = new Set(expectedNames);

  if (actualNames.length !== actualSet.size) {
    errors.push(`${spec.id}: duplicate assembly part names in authored source`);
  }
  for (const name of expectedNames) {
    if (!actualSet.has(name)) errors.push(`${spec.id}: missing component/contact '${name}'`);
  }
  for (const name of actualSet) {
    if (!expectedSet.has(name)) errors.push(`${spec.id}: unexpected assembly part '${name}'`);
  }

  const partByName = new Map(
    assemblyParts.flatMap((record) => {
      const name = record.metadata?.partName;
      return typeof name === 'string' ? [[name, record] as const] : [];
    }),
  );
  for (const run of spec.contactRuns) {
    verifyContactRun(spec.id, run, partByName, records, errors);
  }
  if (spec.undersideContacts) {
    verifyUndersideContacts(spec.id, spec.undersideContacts, partByName, records, errors);
  }
}

function verifyContactRun(
  id: string,
  run: ContactRunSpec,
  partByName: ReadonlyMap<string, FeatureRecord>,
  records: readonly FeatureRecord[],
  errors: string[],
): void {
  const centres: number[] = [];
  for (const name of run.names) {
    const assemblyPart = partByName.get(name);
    const centre = assemblyPart === undefined
      ? undefined
      : assemblyPartPrimitiveCentre(assemblyPart, records);
    if (centre === undefined) {
      errors.push(`${id}: cannot measure authored contact '${name}'`);
      return;
    }
    centres.push(centre[run.axis]);
  }

  for (let index = 1; index < centres.length; index++) {
    if (!approximatelyEqual(centres[index] - centres[index - 1], run.pitchMm)) {
      errors.push(
        `${id}: ${run.names[index - 1]} → ${run.names[index]} pitch is ` +
          `${formatNumber(centres[index] - centres[index - 1])} mm, expected ${run.pitchMm} mm`,
      );
    }
  }
  if (!approximatelyEqual(centres[0] + centres[centres.length - 1], run.symmetricSpanMm)) {
    errors.push(
      `${id}: ${run.names[0]} and ${run.names[run.names.length - 1]} are not centred in ` +
        `the ${run.symmetricSpanMm} mm package span`,
    );
  }
}

function assemblyPartPrimitiveCentre(
  assemblyPart: FeatureRecord,
  records: readonly FeatureRecord[],
): readonly [number, number, number] | undefined {
  const input = assemblyPart.inputs.shape;
  if (input?.kind !== 'feature') return undefined;
  const source = records.find((record) => record.id === input.id);
  if (!source) return undefined;

  if (source.kind === 'sphere') {
    const centre: [number, number, number] = [0, 0, 0];
    for (const transform of source.transforms) {
      if (transform.op !== 'translate') return undefined;
      const x = evaluated(transform.vec.x);
      const y = evaluated(transform.vec.y);
      const z = evaluated(transform.vec.z);
      if (x === undefined || y === undefined || z === undefined) return undefined;
      centre[0] += x;
      centre[1] += y;
      centre[2] += z;
    }
    return centre;
  }
  if (source.kind !== 'box') return undefined;

  const size = [
    evaluated(source.params.x),
    evaluated(source.params.y),
    evaluated(source.params.z),
  ] as const;
  if (size.some((value) => value === undefined)) return undefined;
  const centred = evaluated(source.params.centered) === 1;
  const centre: [number, number, number] = centred
    ? [0, 0, 0]
    : [size[0]! / 2, size[1]! / 2, size[2]! / 2];

  for (const transform of source.transforms) {
    if (transform.op !== 'translate') return undefined;
    const x = evaluated(transform.vec.x);
    const y = evaluated(transform.vec.y);
    const z = evaluated(transform.vec.z);
    if (x === undefined || y === undefined || z === undefined) return undefined;
    centre[0] += x;
    centre[1] += y;
    centre[2] += z;
  }
  return centre;
}

function verifyUndersideContacts(
  id: string,
  spec: UndersideContactSpec,
  partByName: ReadonlyMap<string, FeatureRecord>,
  records: readonly FeatureRecord[],
  errors: string[],
): void {
  const body = partByName.get(spec.bodyName);
  const bodyBounds = body === undefined ? undefined : assemblyPartBoxZBounds(body, records);
  if (!bodyBounds) {
    errors.push(`${id}: cannot measure package body '${spec.bodyName}' for underside-contact clearance`);
    return;
  }
  for (const name of spec.contactNames) {
    const contact = partByName.get(name);
    const contactBounds = contact === undefined ? undefined : assemblyPartBoxZBounds(contact, records);
    if (!contactBounds) {
      errors.push(`${id}: cannot measure underside contact '${name}'`);
      continue;
    }
    if (contactBounds.max > bodyBounds.min + 0.001) {
      errors.push(
        `${id}: underside contact '${name}' overlaps package body ` +
          `(${formatNumber(contactBounds.max)} mm > body base ${formatNumber(bodyBounds.min)} mm)`,
      );
    }
  }
}

function assemblyPartBoxZBounds(
  assemblyPart: FeatureRecord,
  records: readonly FeatureRecord[],
): { min: number; max: number } | undefined {
  const input = assemblyPart.inputs.shape;
  if (input?.kind !== 'feature') return undefined;
  const source = records.find((record) => record.id === input.id);
  if (!source || source.kind !== 'box') return undefined;
  const height = evaluated(source.params.z);
  if (height === undefined) return undefined;
  const centered = evaluated(source.params.centered) === 1;
  let min = centered ? -height / 2 : 0;
  let max = centered ? height / 2 : height;
  for (const transform of source.transforms) {
    if (transform.op !== 'translate') return undefined;
    const z = evaluated(transform.vec.z);
    if (z === undefined) return undefined;
    min += z;
    max += z;
  }
  return { min, max };
}

function verifyCatalogRecord(
  spec: AuthoredElectronicPackageSpec,
  record: CatalogRecordLike | undefined,
  detailPath: string,
  catalogDir: string,
  errors: string[],
): void {
  if (!record) return;
  if (record.id !== spec.id) errors.push(`${spec.id}: detail record id is incorrect`);
  const attributes = record.attributes;
  if (!isRecord(attributes)) {
    errors.push(`${spec.id}: detail record has no attributes object`);
    return;
  }
  const bbox = [attributes.bboxXmm, attributes.bboxYmm, attributes.bboxZmm];
  for (let axis = 0; axis < 3; axis++) {
    if (typeof bbox[axis] !== 'number' || !approximatelyEqual(bbox[axis], spec.bboxMm[axis]!)) {
      errors.push(
        `${spec.id}: measured bbox ${['X', 'Y', 'Z'][axis]} is ${String(bbox[axis])} mm, ` +
          `expected ${spec.bboxMm[axis]} mm`,
      );
    }
  }
  if (attributes.package !== spec.package) {
    errors.push(`${spec.id}: emitted package metadata is not '${spec.package}'`);
  }
  if (attributes.pinCount !== spec.pinCount) {
    errors.push(`${spec.id}: emitted pinCount is not ${spec.pinCount}`);
  }
  if (spec.pinPitchMm !== undefined && attributes.pinPitchMm !== spec.pinPitchMm) {
    errors.push(`${spec.id}: emitted pinPitchMm is not ${spec.pinPitchMm}`);
  }

  const stepPath = join(catalogDir, 'step', `${spec.id}.step`);
  if (!existsSync(stepPath) || statSync(stepPath).size === 0) {
    errors.push(`${spec.id}: missing STEP artifact ${stepPath}`);
    return;
  }
  if (record.stepUrl !== undefined && !String(record.stepUrl).endsWith(`/step/${spec.id}.step`)) {
    errors.push(`${spec.id}: detail record stepUrl does not point at its STEP artifact`);
  }
  const stepHash = createHash('sha256').update(readFileSync(stepPath)).digest('hex');
  if (typeof record.sha256 !== 'string' || record.sha256 !== stepHash) {
    errors.push(`${spec.id}: detail record SHA-256 does not match its STEP artifact`);
  }
  if (!existsSync(detailPath)) errors.push(`${spec.id}: missing detail record ${detailPath}`);
}

function verifyRequiredComponentRecord(
  spec: RequiredAuthoredCatalogComponentSpec,
  record: CatalogRecordLike | undefined,
  detailPath: string,
  catalogDir: string,
  errors: string[],
): void {
  if (!record) return;
  if (record.id !== spec.id) errors.push(`${spec.id}: detail record id is incorrect`);
  if (record.family !== spec.family) {
    errors.push(`${spec.id}: detail record family is not '${spec.family}'`);
  }

  const stepPath = join(catalogDir, 'step', `${spec.id}.step`);
  if (!existsSync(stepPath) || statSync(stepPath).size === 0) {
    errors.push(`${spec.id}: missing STEP artifact ${stepPath}`);
    return;
  }
  if (record.stepUrl !== undefined && !String(record.stepUrl).endsWith(`/step/${spec.id}.step`)) {
    errors.push(`${spec.id}: detail record stepUrl does not point at its STEP artifact`);
  }
  const stepHash = createHash('sha256').update(readFileSync(stepPath)).digest('hex');
  if (typeof record.sha256 !== 'string' || record.sha256 !== stepHash) {
    errors.push(`${spec.id}: detail record SHA-256 does not match its STEP artifact`);
  }
  if (!existsSync(detailPath)) errors.push(`${spec.id}: missing detail record ${detailPath}`);

  if (!isRecord(record.connectorManifest)) {
    errors.push(`${spec.id}: detail record has no authored connector manifest`);
    return;
  }
  const manifest = record.connectorManifest as HashBoundConnectorManifest;
  try {
    validateHashBoundConnectorManifest(manifest, {
      partId: spec.id,
      family: spec.family,
      geometrySha256: stepHash,
    });
  } catch (error) {
    errors.push(`${spec.id}: invalid authored connector manifest — ${formatError(error)}`);
    return;
  }

  const actualByName = new Map(manifest.connectors.map((connector) => [connector.name, connector]));
  const expectedNames = new Set(spec.connectors.map((connector) => connector.name));
  for (const expected of spec.connectors) {
    const actual = actualByName.get(expected.name);
    if (actual === undefined) {
      errors.push(`${spec.id}: authored connector manifest is missing '${expected.name}'`);
    } else if (actual.type !== expected.type) {
      errors.push(
        `${spec.id}: authored connector '${expected.name}' is '${actual.type}', expected '${expected.type}'`,
      );
    }
  }
  for (const actual of manifest.connectors) {
    if (!expectedNames.has(actual.name)) {
      errors.push(`${spec.id}: authored connector '${actual.name}' is unexpected`);
    }
  }
}

function readJson<T>(path: string, errors: string[], label: string): T | undefined {
  if (!existsSync(path)) {
    errors.push(`${label}: missing ${path}`);
    return undefined;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    errors.push(`${label}: invalid JSON — ${formatError(error)}`);
    return undefined;
  }
}

function evaluated(value: unknown): number | undefined {
  if (!isRecord(value) || typeof value.evaluated !== 'number') return undefined;
  return value.evaluated;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function approximatelyEqual(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= 0.001;
}

function formatNumber(value: number): string {
  return Number(value.toFixed(4)).toString();
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseArgs(argv: readonly string[]): VerifyAuthoredElectronicsCatalogOptions {
  let catalogDir: string | undefined;
  let manifestPath = 'scripts/electronics-parts.json';
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--manifest') {
      manifestPath = argv[++index] ?? manifestPath;
    } else if (!argv[index].startsWith('-') && catalogDir === undefined) {
      catalogDir = argv[index];
    }
  }
  if (!catalogDir) {
    throw new Error(
      'Usage: npx tsx scripts/verifyAuthoredElectronicsCatalog.ts <catalogDir> ' +
        '[--manifest scripts/electronics-parts.json]',
    );
  }
  return { catalogDir, manifestPath };
}

async function main(): Promise<void> {
  const result = await verifyAuthoredElectronicsCatalog(parseArgs(process.argv.slice(2)));
  console.log(`Verified ${result.verifiedIds.length} authored electronic package(s): ${result.verifiedIds.join(', ')}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    console.error(formatError(error));
    process.exitCode = 1;
  });
}
