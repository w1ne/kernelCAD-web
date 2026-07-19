// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/backends/occt/occtException.ts
//
// Classifier for the raw values OCCT's Emscripten build throws into JS.
//
// WHY THIS EXISTS
// ---------------
// replicad-opencascadejs is compiled with Emscripten's JS-exception ABI. When
// C++ code inside the wasm module throws, the glue does:
//
//     function ___cxa_allocate_exception(size) { return _malloc(size + 24) + 24 }
//     function ___cxa_throw(ptr, type, destructor) { ...; throw ptr }
//
// i.e. what reaches JS is a bare **number** — the address of the exception
// object in the wasm heap — not an `Error`. Every `e instanceof Error ?
// e.message : String(e)` in our code therefore renders an OCCT failure as a
// meaningless integer like `24`, and the surrounding diagnostic ("file is not
// a valid STEP solid") is an outright lie about what went wrong.
//
// THE `24` FINGERPRINT
// --------------------
// Read the allocator again: the thrown pointer is `malloc(size + 24) + 24`.
// When the wasm heap is exhausted `_malloc` returns 0, so the thrown pointer is
// exactly `0 + 24 === 24`. **A thrown `24` is not a status code and carries no
// per-file meaning — it is the signature of an out-of-memory wasm heap.**
// (Verified by exhausting the heap with raw `_malloc` calls and then importing
// a STEP that parses fine on a healthy heap: the import throws the number 24.)
//
// Emscripten places static data at address 1024 and up, so no *successful*
// exception allocation can ever land below that. We treat any thrown number
// under that floor as a failed allocation rather than special-casing 24 alone,
// because the same arithmetic applies to any C++ exception type OCCT throws
// once malloc starts returning null.
//
// The practical consequence for callers: an OOM is a *host* condition, not a
// property of the input. Retrying after freeing heap can succeed with the exact
// same bytes, and reporting it as bad input sends people to debug the wrong
// thing (which is exactly what happened to the parts catalog).

/** Emscripten's static-data base. Nothing valid is allocated below this. */
const WASM_STATIC_BASE = 1024;

/** Stable substring stamped into every OOM message so wrapped failures stay
 *  identifiable after the raw pointer has been discarded. */
export const OUT_OF_MEMORY_MARKER = 'OCCT wasm heap exhausted';

/**
 * True when `e` is a raw Emscripten C++ exception pointer (a bare number)
 * whose value proves the underlying `malloc` returned null — i.e. the OCCT
 * wasm heap is exhausted.
 */
export function isOcctOutOfMemory(e: unknown): boolean {
  return typeof e === 'number' && Number.isInteger(e) && e >= 0 && e < WASM_STATIC_BASE;
}

/** True when `e` is a raw Emscripten exception pointer of any kind. */
export function isRawOcctThrow(e: unknown): boolean {
  return typeof e === 'number';
}

/**
 * Render a value thrown out of the OCCT wasm module as something a human can
 * act on. `Error`s pass through by message; the OOM fingerprint is named as
 * such; any other bare pointer is labelled as the opaque thing it is, so a
 * reader is not misled into thinking the number means anything.
 */
export function describeOcctThrow(e: unknown): string {
  if (isOcctOutOfMemory(e)) {
    return (
      `${OUT_OF_MEMORY_MARKER} (allocation failed; raw exception pointer ${String(e)}). ` +
      'This is a host memory condition, not a problem with the input geometry.'
    );
  }
  if (isRawOcctThrow(e)) {
    return (
      `OCCT threw a C++ exception at wasm address ${String(e)} ` +
      '(Emscripten throws a bare pointer; no message is recoverable from this build).'
    );
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * True when `e` is an already-wrapped out-of-memory failure — a `KernelError`
 * (or any Error) that one of the import sites above produced from a raw OOM
 * pointer. By that point the bare number is gone, so callers further up the
 * stack (the ingest driver) match on the marker those sites stamp into the
 * hint/message instead.
 */
export function isOutOfMemoryMessage(e: unknown): boolean {
  if (typeof e !== 'object' || e === null) return false;
  const hint = (e as { hint?: unknown }).hint;
  if (typeof hint === 'string' && hint.includes('.out-of-memory')) return true;
  const message = (e as { message?: unknown }).message;
  return typeof message === 'string' && message.includes(OUT_OF_MEMORY_MARKER);
}
