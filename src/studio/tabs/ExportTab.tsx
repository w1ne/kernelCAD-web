import { useCallback, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { apiCall, rewritePath } from '../api/apiBase';
import type { JSX } from 'react';

// Studio Export tab. Slice 1.4 + Slice A export-trio.
//
// Talks to /__kernelcad/export (server-side middleware in vite.config.ts)
// which routes to runAndExport(...) from src/agent/script-runtime/export.
// Slice A widens the format set from {stl, step} to the five Slice A
// targets: stl, step, dxf, 3mf, glb. The middleware threads `format`
// verbatim through to runAndExport.
//
// Visibility is adaptive: ExportTab is only rendered by Inspector when
// the recompute result has at least one geometry. See
// src/studio/logic/adaptiveTabs.ts. DXF additionally requires at least
// one planar face in the scene — non-planar 3D solids hit
// export.dxf.non-planar on the runtime side, so the button is disabled
// adaptively in the UI to surface that constraint earlier.

type ExportFormat = 'stl' | 'step' | 'dxf' | '3mf' | 'glb';

interface FormatDescriptor {
    id: ExportFormat;
    label: string;
    help: string;
    requiresPlanar?: boolean;
}

const FORMATS: ReadonlyArray<FormatDescriptor> = [
    { id: 'stl', label: 'STL', help: 'Mesh; printable / preview' },
    { id: 'step', label: 'STEP', help: 'BREP; CAD interchange' },
    { id: 'dxf', label: 'DXF', help: 'Planar profile; laser / waterjet', requiresPlanar: true },
    { id: '3mf', label: '3MF', help: 'Slicer mesh with per-part colors' },
    { id: 'glb', label: 'GLB', help: 'Web / AR viewer; PBR materials' },
];

function getCurrentScriptParam(): string | null {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('script');
}

export function ExportTab(): JSX.Element {
    const { geometries } = useRecomputeResult();
    const [pending, setPending] = useState<ExportFormat | null>(null);
    const [error, setError] = useState<string | null>(null);

    // DXF is planar-only. The runtime side already fails non-planar input with
    // export.dxf.non-planar; this UI gate surfaces the constraint adaptively
    // so the button is visibly inert when no planar source exists. GeometryResult
    // does not carry a top-level `kind` field today (see src/shared/worker/
    // workerTypes.ts:139), but faces[*].plane is populated by the lowerer for
    // planar faces — that's the field we key on.
    const hasPlanar = geometries.some((g) =>
        Array.isArray(g.faces) && g.faces.some((f) => f.plane !== undefined),
    );

    const handleExport = useCallback(async (format: ExportFormat) => {
        setError(null);
        const script = getCurrentScriptParam();
        if (!script) {
            setError('Export requires the studio to be loaded from a script URL (?script=…).');
            return;
        }
        setPending(format);
        try {
            const { base, headers } = await apiCall();
            const url = rewritePath(
                `/__kernelcad/export?script=${encodeURIComponent(script)}&format=${format}`,
                base,
            );
            const response = await fetch(url, { headers });
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
