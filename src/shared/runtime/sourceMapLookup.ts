// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Minimal Source Map v3 position lookup.
//
// The script runtime transpiles `.kcad.ts` with the TypeScript compiler before
// handing the result to `vm`. A V8 call-site frame therefore reports positions
// in the GENERATED text, while every agent-facing surface (repair regions, AST
// edit patches, diagnostics) must speak the coordinates of the file the agent
// actually edits. This module decodes the `mappings` field the transpiler
// already emits and answers "which original position produced this generated
// position?".
//
// Scope is deliberately narrow: one source file, generated→original only, no
// name resolution and no reverse lookup. That keeps it a ~90-line dependency-free
// helper instead of pulling a source-map package into the runtime bundle.

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const BASE64_VALUES: ReadonlyMap<string, number> = new Map(
  BASE64_ALPHABET.split('').map((ch, i) => [ch, i] as const),
);

/** One decoded mapping segment: a generated column on some generated line and
 *  the original (line, column) that produced it. All values 0-based, matching
 *  the Source Map v3 wire format. */
interface MappingSegment {
  generatedColumn: number;
  originalLine: number;
  originalColumn: number;
}

export interface SourceMapPosition {
  /** 1-based line in the original source. */
  line: number;
  /** 1-based column in the original source. */
  column: number;
}

/** Decode a VLQ-encoded mapping string into per-generated-line segment lists. */
function decodeMappings(mappings: string): MappingSegment[][] {
  const lines: MappingSegment[][] = [];
  let originalLine = 0;
  let originalColumn = 0;

  for (const lineText of mappings.split(';')) {
    const segments: MappingSegment[] = [];
    let generatedColumn = 0;
    if (lineText.length > 0) {
      for (const segmentText of lineText.split(',')) {
        if (segmentText.length === 0) continue;
        const fields = decodeVlqSegment(segmentText);
        if (fields.length === 0) continue;
        generatedColumn += fields[0];
        // A 1-field segment carries no original position — it marks generated
        // text with no source counterpart (injected helpers). Skip it.
        if (fields.length < 4) continue;
        originalLine += fields[2];
        originalColumn += fields[3];
        segments.push({ generatedColumn, originalLine, originalColumn });
      }
    }
    segments.sort((a, b) => a.generatedColumn - b.generatedColumn);
    lines.push(segments);
  }
  return lines;
}

/** Decode one comma-free VLQ segment into its signed integer fields. */
function decodeVlqSegment(segment: string): number[] {
  const out: number[] = [];
  let shift = 0;
  let value = 0;
  for (const ch of segment) {
    const digit = BASE64_VALUES.get(ch);
    if (digit === undefined) return out; // malformed — stop, keep what parsed
    const hasContinuation = (digit & 32) !== 0;
    value += (digit & 31) << shift;
    if (hasContinuation) {
      shift += 5;
      continue;
    }
    const negative = (value & 1) === 1;
    const magnitude = value >>> 1;
    out.push(negative ? -magnitude : magnitude);
    shift = 0;
    value = 0;
  }
  return out;
}

/**
 * Generated→original position lookup over a single Source Map v3 document.
 *
 * `lookup` returns the original position for the nearest mapping at or before
 * the requested generated column, which is what V8 frame columns need (a frame
 * points at the start of the call expression, mid-segment).
 */
export class SourceMapLookup {
  private readonly lines: MappingSegment[][];

  private constructor(lines: MappingSegment[][]) {
    this.lines = lines;
  }

  /** Build from the raw JSON string a transpiler emits. Returns `undefined`
   *  when the text is absent or unparseable — callers then fall back to
   *  identity mapping rather than reporting a wrong position. */
  static fromJson(sourceMapText: string | undefined): SourceMapLookup | undefined {
    if (sourceMapText === undefined || sourceMapText.trim() === '') return undefined;
    let parsed: { mappings?: unknown };
    try {
      parsed = JSON.parse(sourceMapText) as { mappings?: unknown };
    } catch {
      return undefined;
    }
    if (typeof parsed.mappings !== 'string') return undefined;
    return new SourceMapLookup(decodeMappings(parsed.mappings));
  }

  /**
   * Map a 1-based generated (line, column) to a 1-based original position.
   * Returns `undefined` when the generated line carries no mapping segment at
   * or before that column.
   */
  lookup(generatedLine: number, generatedColumn: number): SourceMapPosition | undefined {
    const segments = this.lines[generatedLine - 1];
    if (segments === undefined || segments.length === 0) return undefined;
    const target = generatedColumn - 1;
    let best: MappingSegment | undefined;
    for (const segment of segments) {
      if (segment.generatedColumn > target) break;
      best = segment;
    }
    // Frame columns can precede the first segment on a line (leading trivia);
    // the first segment is still the right statement.
    const chosen = best ?? segments[0];
    return { line: chosen.originalLine + 1, column: chosen.originalColumn + 1 };
  }
}
