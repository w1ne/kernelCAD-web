// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/stepHeader.ts
//
// Stamp the STEP (ISO 10303-21) HEADER with the program that wrote the file.
//
// OCCT writes FILE_NAME(name, time_stamp, (author), (organization),
// preprocessor_version, originating_system, authorization) with
// originating_system = 'Open CASCADE <ver>'. kernelCAD is the originating
// system of a kernelCAD export, and OCCT stays named as the preprocessor, so
// only the 6th argument changes. The DATA section is never touched.

/** Index of FILE_NAME's `originating_system` argument (0-based). */
const ORIGINATING_SYSTEM_ARG = 5;

function bytesToLatin1(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

function latin1ToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** A STEP string literal: single quotes, embedded quotes doubled. */
function stepString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Top-level argument spans of the parameter list that opens at `open` (the
 * index of `(`). Returns [start, end) pairs and the index of the closing `)`,
 * or null when the list is not closed.
 */
function argumentSpans(
  text: string,
  open: number,
): { spans: Array<[number, number]>; close: number } | null {
  const spans: Array<[number, number]> = [];
  let depth = 0;
  let argStart = open + 1;
  for (let i = open + 1; i < text.length; i++) {
    const c = text[i];
    if (c === "'") {
      // Skip the string literal; '' is an escaped quote inside it.
      i++;
      while (i < text.length) {
        if (text[i] === "'" && text[i + 1] === "'") i += 2;
        else if (text[i] === "'") break;
        else i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      if (depth === 0) {
        spans.push([argStart, i]);
        return { spans, close: i };
      }
      depth--;
    } else if (c === ',' && depth === 0) {
      spans.push([argStart, i]);
      argStart = i + 1;
    }
  }
  return null;
}

/**
 * Locate FILE_NAME's originating_system argument in the HEADER section. The
 * header ends at the first ENDSEC and is plain ASCII, so only a bounded prefix
 * is decoded; a large DATA section is never copied into a string.
 */
function locateOriginatingSystem(
  bytes: Uint8Array,
): { header: string; headerEnd: number; start: number; end: number } | undefined {
  const prefix = bytesToLatin1(bytes.subarray(0, Math.min(bytes.length, 16384)));
  const headerEnd = prefix.indexOf('ENDSEC;');
  if (!prefix.startsWith('ISO-10303-21;') || headerEnd < 0) return undefined;
  const header = prefix.slice(0, headerEnd);
  const fileName = /FILE_NAME\s*\(/.exec(header);
  if (!fileName) return undefined;
  const parsed = argumentSpans(header, fileName.index + fileName[0].length - 1);
  if (!parsed || parsed.spans.length <= ORIGINATING_SYSTEM_ARG) return undefined;
  const [start, end] = parsed.spans[ORIGINATING_SYSTEM_ARG]!;
  return { header, headerEnd, start, end };
}

/**
 * Return `bytes` with FILE_NAME's originating_system set to `generator`.
 * Input that is not a recognizable Part 21 header comes back unchanged.
 */
export function stampStepOriginatingSystem(bytes: Uint8Array, generator: string): Uint8Array {
  const loc = locateOriginatingSystem(bytes);
  if (!loc) return bytes;
  const { header, headerEnd, start, end } = loc;
  const head = latin1ToBytes(header.slice(0, start) + stepString(generator) + header.slice(end));
  const out = new Uint8Array(head.length + bytes.length - headerEnd);
  out.set(head, 0);
  out.set(bytes.subarray(headerEnd), head.length);
  return out;
}

/** Read FILE_NAME's originating_system back (unquoted), or undefined. */
export function readStepOriginatingSystem(bytes: Uint8Array): string | undefined {
  const loc = locateOriginatingSystem(bytes);
  if (!loc) return undefined;
  const raw = loc.header.slice(loc.start, loc.end).trim();
  if (!raw.startsWith("'") || !raw.endsWith("'")) return undefined;
  return raw.slice(1, -1).replace(/''/g, "'");
}
