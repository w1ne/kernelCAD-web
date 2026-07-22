// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
export type EmbedPresentation = 'viewer' | 'studio';

/** The plain embed stays the compatibility default; Studio is opt-in per host. */
export function embedPresentationMode(value: unknown): EmbedPresentation {
  return value === 'studio' ? 'studio' : 'viewer';
}
