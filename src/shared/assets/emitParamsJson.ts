// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ParamEntry, ParamValue } from '../runtime/paramTable';

/** Emit canonical, human-readable JSON from the evaluated parameter table. */
export function emitParamsJson(
  entries: readonly Pick<ParamEntry, 'name' | 'value' | 'defaultValue'>[],
): string {
  const params: Record<string, ParamValue> = {};
  const ordered = [...entries].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  for (const entry of ordered) {
    params[entry.name] = entry.value ?? entry.defaultValue;
  }
  return `${JSON.stringify(params, null, 2)}\n`;
}
