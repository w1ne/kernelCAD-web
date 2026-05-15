import { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import type { JSX } from 'react';

// Studio Export tab. Slice 1.4.
//
// Talks to /__kernelcad/export (server-side middleware in vite.config.ts)
// which routes to runAndExport(...) from src/script-runtime/export. STL +
// STEP are the formats v0.1 commits to via OcctBackend.exportSTLAsync /
// exportSTEPAsync. BREP / multi-view PDF are roadmapped (v0.8 outputs)
// and ship later.
//
// Visibility is adaptive: ExportTab is only rendered by Inspector when
// the recompute result has at least one geometry. See
// src/studio/logic/adaptiveTabs.ts.

type ExportFormat = 'stl' | 'step';

const FORMATS: Array<{ id: ExportFormat; label: string; help: string }> = [
    { id: 'stl', label: 'STL', help: 'Mesh; printable / preview' },
    { id: 'step', label: 'STEP', help: 'BREP; CAD interchange' },
];

function getCurrentScriptParam(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('script');
}

export function ExportTab(): JSX.Element {
    const { geometries } = useRecomputeResult();
    const [pending, setPending] = useState<ExportFormat | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExport = useCallback(async (format: ExportFormat) => {
        setError(null);
        const script = getCurrentScriptParam();
        if (!script) {
            setError('Export requires the studio to be loaded from a script URL (?script=…).');
            return;
        }
        setPending(format);
        try {
            const url = `/__kernelcad/export?script=${encodeURIComponent(script)}&format=${format}`;
            const response = await fetch(url);
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(typeof payload?.error === 'string' ? payload.error : response.statusText);
            }
            const blob = await response.blob();
            const downloadName =
                response.headers
                    .get('content-disposition')
                    ?.match(/filename="?([^";]+)"?/)?.[1]
                ?? `kernelcad-export.${format}`;
            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = objectUrl;
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(objectUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setPending(null);
        }
    }, []);

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
                    return (
                        <li key={f.id}>
                            <button
                                type="button"
                                onClick={() => handleExport(f.id)}
                                disabled={pending !== null}
                                data-testid={`export-${f.id}`}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded border border-[#2b313c] bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed text-gray-200 text-xs transition-colors"
                            >
                                <span className="flex flex-col items-start gap-0.5">
                                    <span className="font-semibold">{f.label}</span>
                                    <span className="text-[10px] text-gray-500">{f.help}</span>
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

            {error != null && (
                <div
                    role="alert"
                    data-testid="export-tab-error"
                    className="mt-2 px-3 py-2 rounded border border-red-900 bg-red-950/40 text-red-300 text-[11px]"
                >
                    {error}
                </div>
            )}
        </div>
    );
}

export default ExportTab;
