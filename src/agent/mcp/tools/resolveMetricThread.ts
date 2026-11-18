// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// MCP `resolve_metric_thread`. Nominal or tap-drill diameter → ISO 261 coarse
// designation. Does not cut geometry and does not treat a clearance bore as a tap.

import { isKernelError } from '../../../shared/intent/kernelError';
import {
  matchMetricThreadFromDiameter,
  type MetricThreadFromDiameterOptions,
  type MetricThreadMatchKind,
} from '../../../modeling/threads';

export interface ResolveMetricThreadInput {
  diameter_mm?: unknown;
  kind?: unknown;
  tolerance_mm?: unknown;
}

export interface ResolveMetricThreadResult {
  ok: boolean;
  spec?: string;
  diameter_mm?: number;
  pitch_mm?: number;
  coarse?: boolean;
  tap_drill_mm?: number;
  minor_diameter_mm?: number;
  kind_matched?: 'nominal' | 'tap_drill';
  warnings?: string[];
  error?: string;
  errorCode?: string;
  candidates?: string[];
}

function candidatesOf(message: string): string[] | undefined {
  // Specs contain dots (M1x0.25), so stop at the em dash that follows the list.
  const named = message.match(/equidistant from (.+?) —/);
  if (!named) return undefined;
  const specs = named[1].match(/M\d+(?:\.\d+)?x(?:\d+\.\d+|\d+)/g);
  return specs && specs.length > 0 ? specs : undefined;
}

function optionsOf(input: ResolveMetricThreadInput): MetricThreadFromDiameterOptions {
  const opts: MetricThreadFromDiameterOptions = {};
  if (input.kind !== undefined) opts.kind = input.kind as MetricThreadMatchKind;
  if (input.tolerance_mm !== undefined) opts.toleranceMm = input.tolerance_mm as number;
  return opts;
}

/** Map a millimetre diameter to the ISO 261 coarse thread, or a typed refusal. */
export function resolveMetricThreadTool(input: ResolveMetricThreadInput): ResolveMetricThreadResult {
  try {
    const match = matchMetricThreadFromDiameter(input.diameter_mm as number, optionsOf(input));
    const warnings: string[] = [];
    if (match.deltaMm > 1e-6) {
      warnings.push(`snapped ${String(input.diameter_mm)} mm to ${match.info.spec} (${match.deltaMm.toFixed(4)} mm away)`);
    }
    if (input.kind === 'auto' && match.kindMatched === 'tap_drill') {
      warnings.push('matched a tap drill (D - P), not a nominal diameter');
    }
    return {
      ok: true,
      spec: match.info.spec,
      diameter_mm: match.info.diameter,
      pitch_mm: match.info.pitch,
      coarse: match.info.coarse,
      tap_drill_mm: match.info.tapDrill,
      minor_diameter_mm: match.info.minorDiameter,
      kind_matched: match.kindMatched,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  } catch (error) {
    if (!isKernelError(error)) throw error;
    const candidates = candidatesOf(error.message);
    return {
      ok: false,
      errorCode: error.code,
      error: error.message,
      ...(candidates ? { candidates } : {}),
    };
  }
}
