// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useState } from 'react';
import { EXPORT_FORMATS } from '../../exportFormats';
import type { StudioExportFormat } from '../../exportViaServer';

const LAST_EXPORT_KEY = 'kernelcad.export.lastFormat';

function readLastExport(): StudioExportFormat {
    try {
        const saved = localStorage.getItem(LAST_EXPORT_KEY);
        if (saved && EXPORT_FORMATS.some(f => f.id === saved)) return saved as StudioExportFormat;
    } catch {
        /* storage blocked: fall back to STL */
    }
    return 'stl';
}

/** The format the split button offers first: the last one used, else STL. */
export function useLastExportFormat(): [StudioExportFormat, (format: StudioExportFormat) => void] {
    const [format, setFormat] = useState<StudioExportFormat>(readLastExport);
    const remember = (next: StudioExportFormat) => {
        setFormat(next);
        try {
            localStorage.setItem(LAST_EXPORT_KEY, next);
        } catch {
            /* not remembered; the export still runs */
        }
    };
    return [format, remember];
}
