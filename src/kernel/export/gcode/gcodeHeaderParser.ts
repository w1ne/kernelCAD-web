// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// src/kernel/export/gcode/gcodeHeaderParser.ts
//
// Parses the comment header/footer OrcaSlicer (and PrusaSlicer, same
// comment vocabulary) writes into every G-code file it produces, into
// structured print stats. These are the slicer's own real numbers —
// kernelCAD does not estimate anything itself.

export interface GcodeStats {
  /** Total estimated print time in seconds ("estimated printing time (normal mode) = 19m 33s"). */
  estimatedPrintTimeSeconds?: number;
  /** Total filament mass in grams ("total filament used [g] = 3.86"). */
  filamentUsedGrams?: number;
  /** Total filament length in meters, derived from "filament used [mm]". */
  filamentUsedMeters?: number;
  /** Total layer count ("total layers count = 100" / "total layer number: 100"). */
  layerCount?: number;
  /** Maximum Z height reached, in mm ("max_z_height: 20.00"). */
  maxZMm?: number;
}

/** Parse a duration like "1h 2m 3s", "19m 33s", or "2s" into seconds. */
function parseDuration(text: string): number | undefined {
  const re = /(\d+)\s*h|(\d+)\s*m(?!m)|(\d+)\s*s/g;
  let total = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matched = true;
    if (m[1] !== undefined) total += Number(m[1]) * 3600;
    else if (m[2] !== undefined) total += Number(m[2]) * 60;
    else if (m[3] !== undefined) total += Number(m[3]);
  }
  return matched ? total : undefined;
}

/**
 * Parse an OrcaSlicer/PrusaSlicer G-code file's comment metadata into
 * structured stats. Tolerant of missing fields (returns `undefined` for
 * anything not found) — the slicer's exact comment set varies slightly by
 * version and print-mode.
 */
export function parseGcodeHeader(gcode: string): GcodeStats {
  const stats: GcodeStats = {};

  const timeMatch = gcode.match(/estimated printing time \(normal mode\)\s*=\s*([^\r\n]+)/i)
    ?? gcode.match(/estimated printing time\s*=\s*([^\r\n]+)/i);
  if (timeMatch) {
    const seconds = parseDuration(timeMatch[1]);
    if (seconds !== undefined) stats.estimatedPrintTimeSeconds = seconds;
  }

  const gramsMatch = gcode.match(/total filament used \[g\]\s*=\s*([\d.]+)/i)
    ?? gcode.match(/filament used \[g\]\s*=\s*([\d.]+)/i);
  if (gramsMatch) stats.filamentUsedGrams = Number(gramsMatch[1]);

  const mmMatch = gcode.match(/filament used \[mm\]\s*=\s*([\d.]+)/i);
  if (mmMatch) stats.filamentUsedMeters = Number(mmMatch[1]) / 1000;

  const layersMatch = gcode.match(/total layers count\s*=\s*(\d+)/i)
    ?? gcode.match(/total layer number:\s*(\d+)/i);
  if (layersMatch) stats.layerCount = Number(layersMatch[1]);

  const maxZMatch = gcode.match(/max_z_height:\s*([\d.]+)/i);
  if (maxZMatch) stats.maxZMm = Number(maxZMatch[1]);

  return stats;
}
