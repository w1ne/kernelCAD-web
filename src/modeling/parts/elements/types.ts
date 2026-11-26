// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { invalidArgs } from '../../../shared/intent/invalidArgs';
import type { ConnectorEntry } from '../../../shared/parts/connectorManifestSchema';
import type { PartRecord } from '../../../shared/parts/types';

export interface ElementSizeSpec {
  dims: Record<string, number>;
  tags?: readonly string[];
  standard?: string;
}

export interface ElementFamilySpec {
  family: string;
  category: string;
  standard?: string;
  sizes: Record<string, ElementSizeSpec>;
  lengthMm?: { min: number; max: number; default: number; exemplars: readonly number[] };
}

export interface ElementRequest {
  family: string;
  size?: string;
  lengthMm?: number;
  beltWidthMm?: number;
}

export interface ResolvedElement {
  id: string;
  name: string;
  family: string;
  size: string;
  category: string;
  standard?: string;
  lengthMm?: number;
  beltWidthMm?: number;
  dims: Record<string, number>;
  tags: string[];
  connectors: ConnectorEntry[];
}

export type ConnectorFactory = (
  size: string,
  dims: Record<string, number>,
  lengthMm: number | undefined,
  beltWidthMm: number | undefined,
) => ConnectorEntry[];

const EXAMPLE = "lib.part({ family: 'linear-rail', size: 'MGN12', lengthMm: 300 })";

export function frameConnector(
  name: string,
  origin: [number, number, number],
  normal: [number, number, number],
): ConnectorEntry {
  return { name, type: 'frame', origin, normal };
}

export function axisConnector(
  name: string,
  origin: [number, number, number],
  axis: [number, number, number],
): ConnectorEntry {
  return { name, type: 'axis', origin, axis };
}

export function sizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function elementId(
  family: string,
  size: string,
  lengthMm?: number,
  beltWidthMm?: number,
): string {
  const length = lengthMm === undefined ? '' : `-l${String(lengthMm).replace('.', '-')}`;
  const belt = beltWidthMm === undefined ? '' : `-b${String(beltWidthMm).replace('.', '-')}`;
  return `element-${sizeToken(family)}-${sizeToken(size)}${length}${belt}`;
}

function requireSizeRow(spec: ElementFamilySpec, size: string | undefined): [string, ElementSizeSpec] {
  if (size === undefined || !Object.hasOwn(spec.sizes, size)) {
    invalidArgs({ api: 'lib.part({ family, size, lengthMm })', path: 'size',
      ...(size === undefined ? { gotText: 'omitted' } : { got: size }),
      requires: `a stocked ${spec.family} size: ${Object.keys(spec.sizes).join(', ')}`,
      example: EXAMPLE });
  }
  return [size, spec.sizes[size]!];
}

function formatElementName(size: string, length?: number, beltWidth?: number): string {
  const lengthPart = length === undefined ? '' : ` × ${length} mm`;
  const beltPart = beltWidth === undefined ? '' : `, ${beltWidth} mm belt`;
  return `${size}${lengthPart}${beltPart}`;
}

export function resolveFromSpec(
  spec: ElementFamilySpec,
  request: ElementRequest,
  makeConnectors: ConnectorFactory,
  options: { beltWidths?: readonly number[] } = {},
): ResolvedElement {
  if (request.family !== spec.family) {
    invalidArgs({ api: 'lib.part({ family, size, lengthMm })', path: 'family', got: request.family,
      requires: `family '${spec.family}'`, example: EXAMPLE });
  }
  const [size, row] = requireSizeRow(spec, request.size);
  const length = resolveLength(spec, request.lengthMm);
  const beltWidth = resolveBeltWidth(options.beltWidths, request.beltWidthMm);
  const dims: Record<string, number> = { ...row.dims };
  if (length !== undefined) dims.lengthMm = length;
  if (beltWidth !== undefined) dims.beltWidthMm = beltWidth;
  const standard = row.standard ?? spec.standard;
  const resolved: ResolvedElement = {
    id: elementId(spec.family, size, length, beltWidth),
    name: formatElementName(size, length, beltWidth),
    family: spec.family, size, category: spec.category,
    dims, tags: [spec.family, size, ...(row.tags ?? [])],
    connectors: makeConnectors(size, dims, length, beltWidth),
  };
  if (standard !== undefined) resolved.standard = standard;
  if (length !== undefined) resolved.lengthMm = length;
  if (beltWidth !== undefined) resolved.beltWidthMm = beltWidth;
  return resolved;
}

function resolveLength(spec: ElementFamilySpec, requested: number | undefined): number | undefined {
  const range = spec.lengthMm;
  if (range === undefined) {
    if (requested !== undefined) invalidArgs({ api: 'lib.part({ family, size, lengthMm })', path: 'lengthMm',
      got: requested, requires: 'no lengthMm for this fixed-size family', example: EXAMPLE });
    return undefined;
  }
  const value = requested ?? range.default;
  if (!Number.isFinite(value) || value < range.min || value > range.max) {
    invalidArgs({ api: 'lib.part({ family, size, lengthMm })', path: 'lengthMm', got: value,
      requires: `a finite length from ${range.min} to ${range.max}`, unit: 'mm', example: EXAMPLE });
  }
  return value;
}

function resolveBeltWidth(allowed: readonly number[] | undefined, requested: number | undefined): number | undefined {
  if (allowed === undefined) {
    if (requested !== undefined) invalidArgs({ api: 'lib.part({ family, size, beltWidthMm })', path: 'beltWidthMm',
      got: requested, requires: 'a timing-pulley family', example: "lib.part({ family: 'timing-pulley', size: 'GT2-20T-5', beltWidthMm: 9 })" });
    return undefined;
  }
  const value = requested ?? allowed[0];
  if (!allowed.includes(value)) invalidArgs({ api: 'lib.part({ family, size, beltWidthMm })', path: 'beltWidthMm',
    got: value, requires: `one of ${allowed.join(', ')} mm`, unit: 'mm',
    example: "lib.part({ family: 'timing-pulley', size: 'GT2-20T-5', beltWidthMm: 9 })" });
  return value;
}

export function elementDigest(text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let index = 0; index < text.length; index += 1) {
    a = Math.imul(a ^ text.charCodeAt(index), 0x01000193);
    b = Math.imul(b ^ text.charCodeAt(text.length - index - 1), 0x811c9dc5);
  }
  let digest = '';
  for (let index = 0; index < 8; index += 1) {
    a = Math.imul(a ^ (b >>> (index % 16)), 0x01000193);
    b = Math.imul(b ^ (a >>> (index % 13)), 0x811c9dc5);
    digest += (a >>> 0).toString(16).padStart(8, '0');
  }
  return digest;
}

export function elementRecord(element: ResolvedElement, sha256 = elementDigest(element.id)): PartRecord {
  return {
    id: element.id, name: `${element.name} ${element.family}`, category: element.category,
    family: element.family, ...(element.standard === undefined ? {} : { standard: element.standard }),
    tags: [...element.tags],
    attributes: { size: element.size, ...element.dims,
      ...(element.lengthMm === undefined ? {} : { lengthMm: element.lengthMm }),
      ...(element.beltWidthMm === undefined ? {} : { beltWidthMm: element.beltWidthMm }) },
    sha256, source: 'local-catalog', license: 'MIT', connectors: element.connectors.map(({ name }) => name),
    connectorManifest: { schemaVersion: 1, partId: element.id, family: element.family,
      geometrySha256: sha256, connectors: element.connectors },
  };
}
