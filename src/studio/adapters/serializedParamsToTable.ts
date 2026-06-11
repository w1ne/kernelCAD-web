// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// Adapter: SerializedParamEntry[] → ParamTable.
//
// `/__kernelcad/mesh` returns a `SerializedParamTable` (record keyed by
// name); GeometryContext stores it as `SerializedParamEntry[]`. The
// Studio inspector ParamsTab consumes the real `ParamTable` class so
// it can read `size()`, `list()`, etc. consistently with future writes.

import { ParamTable } from '../../shared/runtime/paramTable';
import type { SerializedParamEntry } from '../../shared/runtime/paramTable';

export function serializedParamsToTable(entries: readonly SerializedParamEntry[]): ParamTable | null {
    if (!entries || entries.length === 0) return null;
    const table = new ParamTable();
    for (const entry of entries) {
        try {
            table.declare(entry.name, entry.type, entry.defaultValue, entry.meta);
            if (entry.value !== entry.defaultValue) {
                table.set(entry.name, entry.value);
            }
        } catch {
            // A duplicate-name or type-mismatch from upstream shouldn't take
            // down the Studio. Skip the offending entry; UX still gets the
            // valid ones.
        }
    }
    return table;
}
