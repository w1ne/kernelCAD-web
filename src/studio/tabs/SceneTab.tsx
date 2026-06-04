import { useMemo } from 'react';
import type { JSX } from 'react';
import type { FeatureRecord } from '../../shared/intent/featureRecord';
import type { ValidatorDiagnostic } from '../../modeling/mates/validator';
import { Eye, EyeOff } from 'lucide-react';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { useFeatureSelection } from '../hooks/useFeatureSelection';
import SceneBrowser from '../components/SceneBrowser';
import { useWorkbench } from '../context/WorkbenchContext';
import { useGeometry } from '../context/GeometryContext';
import { extractHistoryItems } from '../../shared/codeGeneration/codeAnalysis';

/**
 * Adaptive scene tree for the Studio shell. Reads feature records + validity
 * diagnostics from the latest recompute result; emits selection through
 * `useFeatureSelection` so Code, Viewport, and Drawer subscribers see the
 * same id.
 *
 * Selection ids match the routing produced by `routeDiagnosticToSelection`:
 * a part row's id is its `metadata.partName`, a joint/mate row's id is its
 * `metadata.jointName`, otherwise the raw `feature.id`. Drawer → row →
 * Monaco → viewport all speak the same vocabulary.
 *
 * When validity is still null OR the feature list is empty, fall back to
 * the legacy `<SceneBrowser>` driven off the workbench's code history so
 * the user keeps seeing something familiar during pipeline warmup.
 */

interface SceneTabRow {
    readonly rowId: string;
    readonly label: string;
    readonly kind: FeatureRecord['kind'];
}

function buildRows(features: readonly FeatureRecord[]): SceneTabRow[] {
    const rows: SceneTabRow[] = [];
    for (const f of features) {
        if (f.suppressed) continue;
        const meta = (f.metadata ?? {}) as {
            partName?: string;
            jointName?: string;
            mateName?: string;
        };
        let label = f.id;
        let rowId = f.id;
        if (typeof meta.partName === 'string') {
            label = meta.partName;
            rowId = meta.partName;
        } else if (typeof meta.jointName === 'string') {
            label = meta.jointName;
            rowId = meta.jointName;
        } else if (typeof meta.mateName === 'string') {
            label = meta.mateName;
            rowId = meta.mateName;
        }
        rows.push({ rowId, label, kind: f.kind });
    }
    return rows;
}

function highestSeverityForRow(
    rowId: string,
    diagnostics: readonly ValidatorDiagnostic[],
): ValidatorDiagnostic['severity'] | null {
    let best: ValidatorDiagnostic['severity'] | null = null;
    for (const d of diagnostics) {
        const matches =
            d.partName === rowId ||
            d.mateName === rowId ||
            d.partA === rowId ||
            d.partB === rowId;
        if (!matches) continue;
        if (d.severity === 'error') return 'error';
        if (d.severity === 'warning') best = 'warning';
        else if (best === null) best = d.severity;
    }
    return best;
}

function severityDotClasses(severity: ValidatorDiagnostic['severity'] | null): string {
    switch (severity) {
        case 'error':
            return 'bg-red-400';
        case 'warning':
            return 'bg-amber-400';
        case 'info':
            return 'bg-blue-400';
        case null:
        default:
            return 'bg-emerald-500';
    }
}

function severityAriaLabel(severity: ValidatorDiagnostic['severity'] | null): string {
    return severity === null ? 'validity ok' : `validity ${severity}`;
}

export function SceneTab(): JSX.Element {
    const { features, validity } = useRecomputeResult();
    const { selectedFeatureId, selectFeature } = useFeatureSelection();
    const workbench = useWorkbench();
    const { geometries } = useGeometry();

    // Assembly Parts list. The per-part identity rides on the rendered
    // geometries (`assemblyPartName`) — worker-side FeatureRecord serialization
    // is still pending, so `features` is empty for node-rendered assemblies and
    // the feature-based rows below never populate. When the model is an assembly
    // we surface the parts directly here, each with an eye toggle that drives
    // `hiddenIds` (the Viewer hides any geometry whose `assemblyPartName` is in
    // that set). Unique, in first-seen order.
    const partNames = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const g of geometries) {
            const p = g.assemblyPartName;
            if (p && !seen.has(p)) {
                seen.add(p);
                out.push(p);
            }
        }
        return out;
    }, [geometries]);

    const rows = useMemo(() => buildRows(features), [features]);
    const adaptiveActive = validity !== null && rows.length > 0;

    // All hooks must run before any early return (Rules of Hooks) — compute the
    // legacy fallback list here, unconditionally, even though the Parts branch
    // below may return first.
    const fallbackItems = useMemo(
        () => (adaptiveActive ? [] : extractHistoryItems(workbench.code ?? '')),
        [adaptiveActive, workbench.code],
    );

    if (partNames.length > 0) {
        const hiddenIds = workbench.hiddenIds ?? [];
        const anyHidden = partNames.some((p) => hiddenIds.includes(p));
        return (
            <div className="flex flex-col bg-[#111] text-xs" data-testid="scene-tab-parts">
                <div className="flex items-center justify-between px-3 py-2 text-gray-400 uppercase tracking-wider font-semibold border-b border-[#333]">
                    <span>Parts</span>
                    {anyHidden && (
                        <button
                            type="button"
                            data-testid="parts-show-all"
                            className="text-[10px] normal-case text-blue-400 hover:text-blue-300"
                            onClick={() => partNames.forEach((p) => {
                                if (hiddenIds.includes(p)) workbench.toggleVisibility?.(p);
                            })}
                        >
                            Show all
                        </button>
                    )}
                </div>
                <ul className="flex flex-col divide-y divide-[#1f1f1f]" data-testid="scene-tab-parts-rows">
                    {partNames.map((partName) => {
                        const isHidden = hiddenIds.includes(partName);
                        const isSelected = selectedFeatureId === partName;
                        const severity = highestSeverityForRow(partName, validity?.diagnostics ?? []);
                        return (
                            <li key={partName}>
                                <div
                                    data-testid={`part-row-${partName}`}
                                    onClick={() => selectFeature(partName)}
                                    className={`group w-full flex items-center gap-2 px-3 py-1.5 text-gray-300 hover:bg-[#1a1a1a] transition-colors cursor-pointer ${isSelected ? 'bg-selection-blue/20 text-white border-l-2 border-selection-blue' : ''}`}
                                >
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full shrink-0 ${severityDotClasses(severity)}`}
                                        aria-label={severityAriaLabel(severity)}
                                    />
                                    <span className={`truncate flex-1 ${isHidden ? 'text-gray-600 italic' : ''}`} title={partName}>
                                        {partName}
                                    </span>
                                    <button
                                        type="button"
                                        data-testid={`part-visibility-${partName}`}
                                        title={isHidden ? 'Show part' : 'Hide part'}
                                        onClick={(e) => { e.stopPropagation(); workbench.toggleVisibility?.(partName); }}
                                        className={`p-1 rounded hover:bg-[#333] transition-all ${isHidden ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}
                                    >
                                        {isHidden ? <EyeOff size={12} className="text-gray-600" /> : <Eye size={12} className="text-blue-400" />}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    if (!adaptiveActive) {
        return (
            <div data-testid="scene-tab-fallback">
                <SceneBrowser
                    items={fallbackItems}
                    planes={workbench.planes ?? []}
                    selectedItemId={workbench.selectedItemId ?? null}
                    hoveredItemId={workbench.hoveredItemId ?? null}
                    hiddenIds={workbench.hiddenIds ?? []}
                    onSelect={(item) => workbench.setSelectedItemId?.(item.id)}
                    onHover={(id) => workbench.setHoveredItemId?.(id)}
                    onToggleVisibility={(name) => workbench.toggleVisibility?.(name)}
                    onTogglePlane={(id) => workbench.togglePlaneVisibility?.(id)}
                />
            </div>
        );
    }

    const diagnostics = validity!.diagnostics;

    return (
        <div className="flex flex-col bg-[#111] text-xs" data-testid="scene-tab">
            <ul
                className="flex flex-col divide-y divide-[#1f1f1f]"
                data-testid="scene-tab-rows"
            >
                {rows.map((row) => {
                    const severity = highestSeverityForRow(row.rowId, diagnostics);
                    const isSelected = selectedFeatureId === row.rowId;
                    return (
                        <li key={row.rowId}>
                            <button
                                type="button"
                                onClick={() => selectFeature(row.rowId)}
                                data-testid={`scene-row-${row.rowId}`}
                                data-selected={isSelected ? 'true' : 'false'}
                                data-severity={severity ?? 'ok'}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-gray-300 hover:bg-[#1a1a1a] transition-colors ${isSelected
                                        ? 'bg-selection-blue/20 text-white border-l-2 border-selection-blue scene-row-selected'
                                        : ''
                                    }`}
                            >
                                <span
                                    className={`inline-block h-2 w-2 rounded-full shrink-0 ${severityDotClasses(severity)}`}
                                    aria-label={severityAriaLabel(severity)}
                                    data-testid={`scene-row-dot-${row.rowId}`}
                                />
                                <span className="truncate flex-1" title={row.label}>
                                    {row.label}
                                </span>
                                <span className="text-[10px] text-gray-500 shrink-0 font-mono">
                                    {row.kind}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export default SceneTab;
