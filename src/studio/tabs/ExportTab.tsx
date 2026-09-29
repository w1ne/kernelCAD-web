// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useCode } from '../context/CodeContext';
import { downloadBlob, exportViaServer, type StudioExportFormat } from '../exportViaServer';
import { EXPORT_FORMATS as FORMATS, hasPlanarSource } from '../exportFormats';
import { useExportTask } from '../hooks/useExportTask';
import { ExportStatus } from '../components/Shared/ExportStatus';
import type { JSX } from 'react';

// Studio Export tab. Slice 1.4 + Slice A export-trio.
//
// Talks to /__kernelcad/export via exportViaServer (same path as the Header
// STL/STEP buttons) which runs runAndExport on the node OCCT kernel.
// Slice A widens the format set from {stl, step} to the five Slice A
// targets: stl, step, dxf, 3mf, glb.
//
// Visibility is adaptive: ExportTab is only rendered by Inspector when
// the recompute result has at least one geometry. See
// src/studio/logic/adaptiveTabs.ts. DXF additionally requires at least
// one planar face in the scene — non-planar 3D solids hit
// export.dxf.non-planar on the runtime side, so the button is disabled
// adaptively in the UI to surface that constraint earlier.
//
// Progress, cancel, the server's error hint and the shipped-with-warning
// notice come from useExportTask / ExportStatus (shared with the header).

type ExportFormat = StudioExportFormat;

export function ExportTab(): JSX.Element {
    const { geometries } = useRecomputeResult();
    const { code } = useCode();
    const task = useExportTask();
    const { start } = task;
    const pending = FORMATS.find((f) => f.label === task.state.running)?.id ?? null;

    const hasPlanar = hasPlanarSource(geometries);

    const handleExport = useCallback((format: ExportFormat) => {
        const label = FORMATS.find((f) => f.id === format)?.label ?? format.toUpperCase();
        void start(label, (options) => exportViaServer(format, code, options), downloadBlob);
    }, [code, start]);

    if (geometries.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center h-full p-6 text-center text-gray-500 text-xs"
                data-testid="export-tab-empty"
            >
                <p>Nothing to export — the script has not yet produced geometry.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 p-3" data-testid="export-tab">
            <p className="text-[11px] text-gray-500">
                Exports run server-side via the OCCT backend and stream a download.
            </p>

            <ul className="flex flex-col gap-2">
                {FORMATS.map((f) => {
                    const isPending = pending === f.id;
                    const planarBlocked = f.requiresPlanar === true && !hasPlanar;
                    const disabled = pending !== null || planarBlocked;
                    const help = planarBlocked
                        ? `${f.help} (no planar source available)`
                        : f.help;
                    return (
                        <li key={f.id}>
                            <button
                                type="button"
                                onClick={() => handleExport(f.id)}
                                disabled={disabled}
                                data-testid={`export-${f.id}`}
                                title={planarBlocked
                                    ? 'DXF export needs a planar face or sheet-metal flat pattern.'
                                    : undefined}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-[#2b313c] bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-xs transition-colors"
                            >
                                <span className="flex flex-col items-start gap-0.5">
                                    <span className="font-semibold">{f.label}</span>
                                    <span className="text-[10px] text-gray-500">{help}</span>
                                </span>
                                {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                ) : (
                                    <Download className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <ExportStatus task={task} testId="export-tab-status" />
        </div>
    );
}

export default ExportTab;
