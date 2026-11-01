// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/stepReproducible.ts
//
// Make an OCCT STEP export a pure function of its shape, so the same model
// always hashes to the same file.
//
// Two values in OCCT's output come from process state, not from the shape:
// - FILE_NAME's time_stamp is the wall clock.
// - An unnamed body's PRODUCT is named '<write.step.product.name> N[.M...]'.
//   The leading index N comes from a counter in OCCT's process-global STEP
//   controller (STEPConstruct_ContextTool), so it grows with every export the
//   process has made; the trailing .M indices are numbered within the file.
// The counter is not bound to JS, so the written bytes are normalized: the
// time stamp is pinned and the leading indices are shifted so the file's
// first transfer is 1, which is exactly what the first export in a fresh
// process writes. Geometry and every other entity are left as written.

import { stampStepTimeStamp } from './stepHeader';

/** FILE_NAME time_stamp written into every reproducible STEP export. */
export const STEP_REPRODUCIBLE_TIME_STAMP = '1970-01-01T00:00:00';

function bytesToLatin1(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += 0x8000) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + 0x8000)));
  }
  return chunks.join('');
}

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/**
 * Shift the leading index of every auto-generated PRODUCT name
 * ('<productName> N[.M...]') so the smallest one in the file is 1.
 */
export function renumberStepAutoProductNames(bytes: Uint8Array, productName: string): Uint8Array {
  const quoted = productName.replace(/'/g, "''");
  const escaped = quoted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`'${escaped} (\\d+)((?:\\.\\d+)*)'`, 'g');
  const text = bytesToLatin1(bytes);
  let first = Infinity;
  for (const m of text.matchAll(pattern)) first = Math.min(first, Number(m[1]));
  if (!Number.isFinite(first) || first === 1) return bytes;
  return latin1ToBytes(
    text.replace(pattern, (_m, index: string, rest: string) => `'${quoted} ${Number(index) - first + 1}${rest}'`),
  );
}

/**
 * Return `bytes` with the export-order-dependent values pinned: FILE_NAME's
 * time_stamp and the auto-generated PRODUCT name indices. `productName` is
 * OCCT's `write.step.product.name` at the time of the write.
 */
export function makeStepReproducible(bytes: Uint8Array, productName: string): Uint8Array {
  return renumberStepAutoProductNames(stampStepTimeStamp(bytes, STEP_REPRODUCIBLE_TIME_STAMP), productName);
}
