// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// One material slot per mesh, named with the same registry GLB export uses.
// Identical payloads share a slot. OBJ tokens keep the registry name; USD
// prims use the USD identifier alphabet.

import type { PBRMaterial } from '../../shared/intent/material';
import { resolveColor } from '../../shared/render/palette';
import { createMaterialNameRegistry } from './materialNaming';

const UNNAMED_BASE_COLOR = '#cccccc';

export interface MeshMaterialInput {
  readonly name: string;
  readonly material?: PBRMaterial;
  readonly color?: string;
  readonly colorParamName?: string;
  readonly finishName?: string;
}

/** Preformatted fields so the OBJ and USD writers stay straight-line. */
export interface MeshMaterialSlot {
  readonly objToken: string;
  readonly usdPrim: string;
  /** sRGB Kd channels, 0–1. */
  readonly kd: string;
  /** Linear UsdPreviewSurface diffuseColor channels. */
  readonly diffuseLinear: string;
  /** Wavefront dissolve (`d`). */
  readonly dissolve: string;
  /** UsdPreviewSurface opacity, 6 decimal places. */
  readonly opacity: string;
  readonly roughness: string;
  readonly metallic: string;
  /** Phong exponent from roughness. */
  readonly ns: string;
}

export function materialTable(parts: readonly MeshMaterialInput[]): MeshMaterialSlot[] {
  const registry = createMaterialNameRegistry();
  const byKey = new Map<string, MeshMaterialSlot>();
  const objUsed = new Set<string>();
  const usdUsed = new Set<string>();
  return parts.map((part, index) => {
    const resolved = registry.resolve({
      pbr: part.material,
      finishName: part.finishName,
      colorParamName: part.colorParamName,
      partName: part.name,
      materialIndex: index,
      color: part.color,
    });
    const existing = byKey.get(resolved.key);
    if (existing !== undefined) return existing;
    const slot = makeSlot(part, resolved.name, objUsed, usdUsed);
    byKey.set(resolved.key, slot);
    return slot;
  });
}

export function uniqueSlots(slots: readonly MeshMaterialSlot[]): MeshMaterialSlot[] {
  const seen = new Set<string>();
  const out: MeshMaterialSlot[] = [];
  for (const slot of slots) {
    if (seen.has(slot.usdPrim)) continue;
    seen.add(slot.usdPrim);
    out.push(slot);
  }
  return out;
}

function makeSlot(
  part: MeshMaterialInput,
  name: string,
  objUsed: Set<string>,
  usdUsed: Set<string>,
): MeshMaterialSlot {
  const rgb = srgbBytes(part.material?.baseColor, part.color);
  const opacity = opacityOf(part.material);
  const roughness = part.material?.roughness === undefined ? 0.5 : clamp01(part.material.roughness);
  return {
    objToken: uniqueToken(objToken(name), objUsed),
    usdPrim: uniqueToken(usdPrim(name), usdUsed),
    kd: rgb.map(kdChannel).join(' '),
    diffuseLinear: rgb.map(linearChannel).map(usdFloat).join(', '),
    dissolve: trimFloat(opacity),
    opacity: usdFloat(opacity),
    roughness: usdFloat(roughness),
    metallic: usdFloat(part.material?.metalness === undefined ? 0 : clamp01(part.material.metalness)),
    ns: trimFloat(specularExponent(roughness)),
  };
}

function objToken(name: string): string {
  const token = name.trim().replace(/[\r\n#]/g, '_').replace(/\s+/g, '_');
  return token.length > 0 ? token : 'material';
}

function usdPrim(name: string): string {
  const safe = name.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^[^A-Za-z_]/, '_$&');
  return safe.length > 0 ? safe : 'Material';
}

function uniqueToken(base: string, used: Set<string>): string {
  let token = base;
  let suffix = 2;
  while (used.has(token)) token = `${base}_${suffix++}`;
  used.add(token);
  return token;
}

function srgbBytes(baseColor: string | undefined, color: string | undefined): [number, number, number] {
  const parsed = parseHex(resolveColor(baseColor ?? color) ?? UNNAMED_BASE_COLOR);
  return parsed ?? parseHex(UNNAMED_BASE_COLOR)!;
}

function parseHex(hex: string): [number, number, number] | undefined {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  if (short) return [parseInt(short[1]! + short[1]!, 16), parseInt(short[2]! + short[2]!, 16), parseInt(short[3]! + short[3]!, 16)];
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i.exec(hex);
  if (!long) return undefined;
  return [parseInt(long[1]!, 16), parseInt(long[2]!, 16), parseInt(long[3]!, 16)];
}

function opacityOf(material: PBRMaterial | undefined): number {
  if (material?.opacity !== undefined) return clamp01(material.opacity);
  const transmission = material?.transmission ?? 0;
  if (transmission > 0) return Math.max(0.05, 1 - transmission);
  return 1;
}

/** Inverse of the glTF roughness mapping `roughness = sqrt(2 / (Ns + 2))`, clamped to [0, 1000]. */
function specularExponent(roughness: number): number {
  if (!(roughness > 0)) return 1000;
  const ns = 2 / (roughness * roughness) - 2;
  if (!Number.isFinite(ns) || ns > 1000) return 1000;
  return ns < 0 ? 0 : ns;
}

function kdChannel(channel: number): string {
  return trimFloat(channel / 255);
}

function linearChannel(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function trimFloat(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return Object.is(rounded, -0) ? '0' : String(rounded);
}

function usdFloat(value: number): string {
  return value.toFixed(6);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
