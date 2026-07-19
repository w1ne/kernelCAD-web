// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// How a docs example's geometry is shaded — the one definition, shared by the
// build-time prebake (site/scripts/prebake-docs-models.ts) and the live Run
// path (site/island/docs-worker.ts).
//
// It has to be one definition. The whole point of prebaking is that the model a
// reader sees on load is the model they get back when they press Run; two
// copies of "how do I turn a colour token into a material" is exactly how those
// two pictures start drifting apart.
//
// No imports on purpose: this is bundled into a web worker and into the page,
// so it must stay free of node built-ins.

/**
 * The shading a docs page reproduces: `.color()`, plus the three `.material()`
 * fields the docs viewer honours. Deliberately narrower than `PBRMaterial` —
 * carrying transmission or clearcoat here would promise a look this viewer's
 * three lights do not deliver.
 */
export interface DocsAppearance {
  readonly color?: string;
  readonly baseColor?: string;
  readonly metalness?: number;
  readonly roughness?: number;
}

/** Fields of a `PBRMaterial` the docs viewer reads. */
export interface DocsPbrSubset {
  readonly baseColor?: string;
  readonly metalness?: number;
  readonly roughness?: number;
}

/** Reduce a meshed feature's colour and PBR metadata to what gets drawn. */
export function appearanceOf(
  color: string | undefined,
  material: DocsPbrSubset | undefined,
): DocsAppearance {
  const out: { -readonly [K in keyof DocsAppearance]: DocsAppearance[K] } = {};
  if (color !== undefined) out.color = color;
  if (material?.baseColor !== undefined) out.baseColor = material.baseColor;
  if (material?.metalness !== undefined) out.metalness = material.metalness;
  if (material?.roughness !== undefined) out.roughness = material.roughness;
  return out;
}
