// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Feature → script call-site binding.
//
// `FeatureRecord.scriptLocation` is the join key between the capture graph and
// the file an agent edits. Nothing populated it before: diagnostics named a
// feature id, and the agent then had to guess which line authored it. This
// module resolves the binding from a real V8 call-site frame taken at capture
// time, then maps it back through the two rewrites the runtime performs
// (module-ism normalization, then TypeScript transpile) so the reported
// position is a coordinate in the ORIGINAL file.
//
// Correctness policy: every step that cannot be resolved exactly degrades to
// `undefined` rather than to a plausible-looking wrong line. A repair region
// built on a wrong line would authorise an edit to unrelated geometry.

import type { ScriptLocation } from '../../shared/intent/types';
import { SourceMapLookup } from '../../shared/runtime/sourceMapLookup';
import { normalizeUserScriptLineMap } from '../../shared/runtime/normalizeUserScript';
import { NO_WRAP_OFFSET, type ScriptWrapOffset } from './isolationTypes';

/** Subset of V8's CallSite we rely on. Declared locally so this module does
 *  not depend on `@types/node`'s ambient NodeJS namespace. */
interface CallSiteLike {
  getFileName(): string | undefined | null;
  getLineNumber(): number | undefined | null;
  getColumnNumber(): number | undefined | null;
}

/**
 * Resolves generated (transpiled) positions back to original-file positions
 * for one script run. Held by the `CaptureSession` for the duration of the run.
 */
export class ScriptLocationResolver {
  private readonly sourceMap: SourceMapLookup | undefined;
  private readonly normalizedToOriginal: number[] | undefined;

  /** Name the runtime gave the script (`vm.Script({ filename })`). Frames are
   *  matched against this exact value. */
  readonly fileName: string;
  /** How the runner's IIFE prologue displaces positions. */
  private readonly wrapOffset: ScriptWrapOffset;

  constructor(
    fileName: string,
    originalCode: string,
    transpiledSourceMap: string | undefined,
    wrapOffset: ScriptWrapOffset = NO_WRAP_OFFSET,
  ) {
    this.fileName = fileName;
    this.wrapOffset = wrapOffset;
    this.sourceMap = SourceMapLookup.fromJson(transpiledSourceMap);
    this.normalizedToOriginal = normalizeUserScriptLineMap(originalCode);
  }

  /** Map a generated (1-based) position to an original-file `ScriptLocation`. */
  resolve(generatedLine: number, generatedColumn: number): ScriptLocation | undefined {
    // Step 0: wrapped → transpiled. The runner's IIFE prologue shifts the first
    // line by a column count and every line by a line count; both are zero for
    // an unwrapped body.
    const transpiledLine = generatedLine - this.wrapOffset.lineOffset;
    const transpiledColumn = generatedLine === this.wrapOffset.lineOffset + 1
      ? generatedColumn - this.wrapOffset.firstLineColumnOffset
      : generatedColumn;
    if (transpiledLine < 1 || transpiledColumn < 1) return undefined;

    // Step 1: transpiled → normalized. Without a source map (browser runtime
    // runs plain JavaScript through a pass-through transpiler) the two texts
    // are the same document, so the position passes through unchanged.
    const normalized = this.sourceMap?.lookup(transpiledLine, transpiledColumn)
      ?? { line: transpiledLine, column: transpiledColumn };

    // Step 2: normalized → original. Identity unless the normalizer deleted
    // top-level import / re-export lines.
    if (this.normalizedToOriginal === undefined) {
      return { file: this.fileName, line: normalized.line, column: normalized.column };
    }
    const originalLine = this.normalizedToOriginal[normalized.line - 1];
    if (originalLine === undefined) return undefined;
    return { file: this.fileName, line: originalLine, column: normalized.column };
  }
}

/**
 * Take the innermost call-site frame that belongs to `fileName`.
 *
 * The kernelCAD API functions are host functions outside the sandbox, so the
 * stack at capture time interleaves host frames with the user-script frame;
 * matching on the script's filename picks the authoring line regardless of how
 * many API layers sit between. `skipAbove` keeps this helper's own frame (and
 * its caller's prologue) out of the trace.
 */
export function captureCallSite(
  fileName: string,
  skipAbove: (...args: never[]) => unknown = captureCallSite,
): { line: number; column: number } | undefined {
  const previousPrepare = Error.prepareStackTrace;
  const previousLimit = Error.stackTraceLimit;
  try {
    Error.stackTraceLimit = STACK_DEPTH;
    Error.prepareStackTrace = (_error, frames) => frames;
    const holder: { stack?: unknown } = {};
    // `captureStackTrace` is V8-only; guard so a non-V8 host degrades to
    // "no location" instead of throwing mid-capture.
    if (typeof Error.captureStackTrace !== 'function') return undefined;
    Error.captureStackTrace(holder, skipAbove);
    const frames = holder.stack;
    if (!Array.isArray(frames)) return undefined;
    for (const frame of frames as CallSiteLike[]) {
      if (typeof frame?.getFileName !== 'function') continue;
      if (frame.getFileName() !== fileName) continue;
      const line = frame.getLineNumber();
      const column = frame.getColumnNumber();
      if (typeof line !== 'number') return undefined;
      return { line, column: typeof column === 'number' ? column : 1 };
    }
    return undefined;
  } catch {
    return undefined;
  } finally {
    Error.prepareStackTrace = previousPrepare;
    Error.stackTraceLimit = previousLimit;
  }
}

/** Frames to collect when probing for the script frame. Deep enough to cross
 *  the proxy/capture/api layers between a user call and `register()`, shallow
 *  enough that the per-feature cost stays negligible. */
const STACK_DEPTH = 60;
