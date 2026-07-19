// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The PURE half of the font module: the `FontPath` brand and its predicate.
//
// `src/modeling/api.ts` exposes `fontPath()` on the script surface, but the
// sibling `index.ts` also owns the font LOADER, which reads TTFs off disk with
// `node:fs`. Keeping both in one module meant every consumer of `fontPath` —
// i.e. the whole modeling API — statically pulled `node:fs`. Splitting the
// brand out lets the API import it in any runtime; the loader stays node-only
// and is reached through a dynamic import at lower time.

/** Branded path type — distinguishes a font file path from a logical font name. */
export type FontPath = string & { readonly _brand: 'FontPath' };

export function fontPath(p: string): FontPath {
  return p as FontPath;
}

export function isFontPath(v: unknown): v is FontPath {
  // Branding is at the type level only; runtime detection is via "looks like a
  // file path" + extension. `.ttf` is the only format we accept today.
  return typeof v === 'string' && v.endsWith('.ttf');
}
