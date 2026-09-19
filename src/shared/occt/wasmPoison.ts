// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/shared/occt/wasmPoison.ts
//
// Message-level classifier for an unusable OCCT wasm heap ("poison").
// Lives in `shared` so browser GeometryEngine can detect soft worker ERROR
// responses without importing `kernel` (layering: shared must not import kernel).
// Kernel re-exports these from occtException.ts; Node reset/reload stays in kernel.

/** Stable substring stamped into poison diagnostics so wrapped failures stay
 *  identifiable after the original RuntimeError has been discarded. */
export const WASM_POISON_MARKER = 'OCCT wasm heap poisoned';

function looksLikeWasmPoisonText(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes(WASM_POISON_MARKER.toLowerCase())) return true;
  if (t.includes('memory access out of bounds')) return true;
  if (t.includes('out of bounds memory access')) return true;
  // Emscripten abort() after unrecoverable wasm failure (truncated BREP, etc.).
  if (t.includes('aborted()') || t.includes('aborted(')) return true;
  if (t.includes('runtimeerror') && t.includes('aborted')) return true;
  return false;
}

/** True when `e` is an already-wrapped poison failure (marker in message/hint). */
export function isWasmPoisonMessage(e: unknown): boolean {
  if (typeof e === 'string') return e.includes(WASM_POISON_MARKER);
  if (typeof e !== 'object' || e === null) return false;
  const hint = (e as { hint?: unknown }).hint;
  if (typeof hint === 'string' && hint.includes('.wasm-poison')) return true;
  const message = (e as { message?: unknown }).message;
  return typeof message === 'string' && message.includes(WASM_POISON_MARKER);
}

/**
 * True when `e` indicates the OCCT wasm module is unusable for further calls —
 * typically `RuntimeError: memory access out of bounds` or `RuntimeError: Aborted()`
 * after an embind double-free / abort. Unlike OOM (a bare sub-1024 pointer), poison
 * is a *corrupt heap*: freeing masters will not help; the module must be reloaded.
 *
 * Also matches already-stringified worker errors (`Error` whose message embeds the
 * RuntimeError text) so GeometryEngine soft-failures are recognized.
 *
 * Intentionally avoids referencing the `WebAssembly` namespace as a value so this
 * module typechecks under CLI tsconfig (`lib: ["ES2022"]`, no DOM). Detection is
 * by `name` / message text — `WebAssembly.RuntimeError` instances report
 * `name === 'RuntimeError'`.
 */
export function isOcctWasmPoisoned(e: unknown): boolean {
  if (isWasmPoisonMessage(e)) return true;
  if (typeof e === 'string') return looksLikeWasmPoisonText(e);
  if (typeof e !== 'object' || e === null) return false;
  const name = (e as { name?: unknown }).name;
  const message = (e as { message?: unknown }).message;
  const msg = typeof message === 'string' ? message : '';
  const nm = typeof name === 'string' ? name : '';
  const isRuntime = nm === 'RuntimeError' || nm === 'WebAssembly.RuntimeError';
  if (isRuntime) return looksLikeWasmPoisonText(msg) || looksLikeWasmPoisonText(`${nm}: ${msg}`);
  // Worker hosts often wrap as a plain Error("RuntimeError: memory access out of bounds").
  if (nm === 'Error' || nm === '') return looksLikeWasmPoisonText(msg);
  return false;
}
