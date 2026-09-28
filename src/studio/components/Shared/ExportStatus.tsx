// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Status of a server export (see useExportTask): progress with elapsed time
// and Cancel, the failure as the server's message plus its hint, or the
// warning notice of a file that shipped with a defect. Renders nothing when
// idle. `floating` pins it under the header for the header export buttons.

import type { JSX } from 'react';
import { Loader2, X } from 'lucide-react';
import { exportProgressText, type ExportTask } from '../../hooks/useExportTask';

export function ExportStatus({ task, floating = false, testId = 'export-status' }: {
    task: ExportTask;
    floating?: boolean;
    testId?: string;
}): JSX.Element | null {
    const { state, cancel, dismiss } = task;
    const progress = exportProgressText(state);
    if (progress === null && state.error === null && state.notice === null) return null;

    const frame = floating
        ? 'fixed top-12 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] shadow-lg'
        : 'mt-2';
    const tone = state.error !== null
        ? 'border-red-900 bg-red-950/90 text-red-200'
        : state.notice !== null
            ? 'border-amber-900 bg-amber-950/90 text-amber-200'
            : 'border-[#2b313c] bg-[#1a1a1a] text-gray-300';

    return (
        <div
            role={state.error !== null ? 'alert' : 'status'}
            aria-live="polite"
            data-testid={testId}
            className={`${frame} flex items-start gap-2 px-3 py-2 rounded border text-[11px] ${tone}`}
        >
            {progress !== null && <Loader2 className="h-3.5 w-3.5 mt-px animate-spin shrink-0" aria-hidden="true" />}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                {progress !== null && <span data-testid={`${testId}-progress`}>{progress}</span>}
                {state.error !== null && (
                    <>
                        <span data-testid={`${testId}-error`}>{state.error.message}</span>
                        {state.error.hint && (
                            <span className="text-red-300/80" data-testid={`${testId}-hint`}>{state.error.hint}</span>
                        )}
                    </>
                )}
                {state.notice !== null && <span data-testid={`${testId}-notice`}>{state.notice}</span>}
            </div>
            {progress !== null ? (
                <button
                    type="button"
                    onClick={cancel}
                    data-testid={`${testId}-cancel`}
                    className="shrink-0 underline hover:text-white"
                >
                    Cancel
                </button>
            ) : (
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss"
                    data-testid={`${testId}-dismiss`}
                    className="shrink-0 opacity-70 hover:opacity-100"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
