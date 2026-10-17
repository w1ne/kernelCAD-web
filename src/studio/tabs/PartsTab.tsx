// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useMemo } from 'react';
import type { JSX } from 'react';
import type { BomRow, BomTotals } from '../../agent/script-runtime/bom';
import { useCode } from '../context/CodeContext';
import { useBom } from '../hooks/useBom';
import { useRecomputeResult } from '../hooks/useRecomputeResult';
import { currentStudioScript } from '../scriptSource';
import { selectionCodeStore } from '../selectionCode/selectionCodeStore';

/**
 * The inspector Parts tab: the design's bill of materials, one row per
 * distinct part (pattern instances collapse into a quantity). Rows come from
 * the server-side BOM because capture-time fields — material, density,
 * declared process, catalog provenance — never reach the browser. Clicking a
 * row highlights every instance of that part in the viewport through the
 * same code-highlight channel the Code tab uses.
 */
export function PartsTab(): JSX.Element {
    const { code } = useCode();
    // The third argument addresses the BOM by the Studio's `?script=` context,
    // so the server resolves the same file (and relative assets) the viewport
    // evaluated — GET parity with the mesh/review fetches.
    const bom = useBom(code, true, currentStudioScript());
    const { features } = useRecomputeResult();

    const featureIdByPartName = useMemo(() => {
        const map = new Map<string, string>();
        for (const feature of features) {
            if (feature.kind !== 'assemblyPart') continue;
            const partName = (feature.metadata as { partName?: unknown } | undefined)?.partName;
            if (typeof partName === 'string') map.set(partName, feature.id);
        }
        return map;
    }, [features]);

    const highlightRow = useCallback((row: BomRow): void => {
        const ids = row.instancePaths
            .map((partName) => featureIdByPartName.get(partName))
            .filter((id): id is string => id !== undefined);
        selectionCodeStore.highlightFromCode(ids);
    }, [featureIdByPartName]);

    if (bom.status === 'loading') {
        return (
            <div className="px-4 py-3 text-sm text-gray-500" data-testid="parts-loading">
                Computing bill of materials…
            </div>
        );
    }
    if (bom.status === 'error') {
        return (
            <div className="px-4 py-3 text-sm text-gray-500" data-testid="parts-error">
                {bom.error ?? 'BOM computation failed.'}
            </div>
        );
    }
    if (bom.status !== 'ready' || bom.rows.length === 0) {
        return (
            <div className="px-4 py-3 text-sm text-gray-500" data-testid="parts-empty-state">
                No assembly parts.
            </div>
        );
    }

    const totals = bom.totals ?? totalsFromRows(bom.rows);
    const made = bom.rows.filter((row) => row.kind === 'fabricated');
    const bought = bom.rows.filter((row) => row.kind === 'purchased');

    return (
        <div className="flex flex-col" data-testid="parts-tab">
            <table className="w-full text-xs text-gray-300" data-testid="parts-table">
                <thead>
                    <tr className="text-left text-2xs text-gray-500">
                        <th className="py-1 pl-3 pr-1 font-normal">#</th>
                        <th className="py-1 pr-2 font-normal">Part</th>
                        <th className="py-1 pr-2 font-normal">Qty</th>
                        <th className="py-1 pr-2 font-normal">Process</th>
                        <th className="py-1 pr-2 font-normal">Material</th>
                        <th className="py-1 pr-3 font-normal">Unit mass</th>
                    </tr>
                </thead>
                <tbody>
                    {made.length > 0 && <GroupRow label="Made" />}
                    {made.map((row) => (
                        <PartsRow key={row.item} row={row} onHighlight={highlightRow} />
                    ))}
                    {bought.length > 0 && <GroupRow label="Bought" />}
                    {bought.map((row) => (
                        <PartsRow key={row.item} row={row} onHighlight={highlightRow} />
                    ))}
                </tbody>
            </table>
            {bom.diagnostics.length > 0 && (
                <ul className="flex flex-col gap-1 px-3 py-2" data-testid="parts-diagnostics">
                    {bom.diagnostics.map((diagnostic, index) => (
                        <li
                            key={`${diagnostic.code}-${index}`}
                            className="rounded border border-amber-900/60 bg-amber-950/30 px-2 py-1.5 text-2xs leading-tight text-amber-200/90"
                            data-testid={`parts-diagnostic-${index}`}
                        >
                            <span className="block">{diagnostic.message}</span>
                            {diagnostic.hint && (
                                <span className="mt-0.5 block text-amber-200/70">{diagnostic.hint}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <div
                className="flex items-center justify-between gap-2 border-t border-[#1f1f1f] px-3 py-2 text-[11px] text-gray-500"
                data-testid="parts-totals"
            >
                <span>
                    {totals.partCount} parts · {totals.uniquePartCount} unique ·{' '}
                    {totals.totalMassG === null ? 'mass unknown' : formatMass(totals.totalMassG)} · prices not included
                </span>
            </div>
        </div>
    );
}

function GroupRow({ label }: { label: string }): JSX.Element {
    return (
        <tr>
            <td
                colSpan={6}
                className="px-3 pb-1 pt-2 text-2xs uppercase tracking-wide text-gray-500"
                data-testid={`parts-group-${label.toLowerCase()}`}
            >
                {label}
            </td>
        </tr>
    );
}

function PartsRow({ row, onHighlight }: {
    readonly row: BomRow;
    readonly onHighlight: (row: BomRow) => void;
}): JSX.Element {
    const process = row.process === null
        ? 'buy'
        : `${row.process}${row.processSource === 'inferred' ? ' (assumed)' : ''}`;
    return (
        <tr
            className="cursor-pointer border-t border-[#1f1f1f] hover:bg-[#1a1a1a]"
            data-testid={`parts-row-${row.item}`}
            onClick={() => onHighlight(row)}
        >
            <td className="py-1.5 pl-3 pr-1 tabular-nums text-2xs text-gray-500">{row.item}</td>
            <td className="py-1.5 pr-2 text-gray-200">{row.name}</td>
            <td className="py-1.5 pr-2 tabular-nums text-gray-300" data-testid={`parts-row-qty-${row.item}`}>
                {row.quantity}
            </td>
            <td className="py-1.5 pr-2 text-gray-400" data-testid={`parts-row-process-${row.item}`}>
                {process}
            </td>
            <td className="py-1.5 pr-2 text-gray-400">{row.material ?? '—'}</td>
            <td className="py-1.5 pr-3 tabular-nums text-gray-300">{formatMass(row.massGPerUnit)}</td>
        </tr>
    );
}

function totalsFromRows(rows: readonly BomRow[]): BomTotals {
    const knownMass = rows.some((row) => row.massGTotal !== null);
    return {
        partCount: rows.reduce((sum, row) => sum + row.quantity, 0),
        uniquePartCount: rows.length,
        totalMassG: knownMass
            ? Math.round(rows.reduce((sum, row) => sum + (row.massGTotal ?? 0), 0) * 1e4) / 1e4
            : null,
    };
}

/** BOM masses are grams; a kilogram-scale total reads better in kg. */
function formatMass(grams: number | null): string {
    if (grams === null) return '—';
    if (grams >= 1000) return `${round(grams / 1000)} kg`;
    return `${round(grams)} g`;
}

function round(value: number): string {
    return String(Math.round(value * 100) / 100);
}

export default PartsTab;
