// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The Order sheet: what the BOM means for actually buying and making the
// parts. Fabricated rows are grouped by process, each group gets an order
// pack (per-part STEP plus STL/DXF/drawing) and quote-shop links; purchased
// rows get vendor handoff paste texts (McMaster part numbers, Mouser/DigiKey
// `pn|qty` lists) and a DigiKey cart pre-fill when every PN is DigiKey's.
//
// Honest scope (S4): this estimates what to order and downloads the files -
// nothing is sent anywhere and no prices are shown. Per-line chips call out
// what would block an order (a purchased part with no vendor PN, a
// fabricated part with no mass source).
import { useMemo } from 'react';
import type { JSX, ReactNode } from 'react';
import { Copy, Download } from 'lucide-react';
import type { BomRow } from '../../agent/script-runtime/bom';
import { FAB_PROCESSES, type FabProcess } from '../../shared/fab';
import { buildHandoffs, digikeyFastAddUrl, handoffItems } from '../../kernel/export/order/handoffs';
import { servicesForProcess } from '../../kernel/export/order/fabServices';
import { buildVendorLink, referralDisclosure } from '../../shared/links/referral';
import { Sheet } from '../../ui/Sheet';
import { useCode } from '../context/CodeContext';
import { useBom } from '../hooks/useBom';
import { useExportTask } from '../hooks/useExportTask';
import { downloadBlob, exportViaServer } from '../exportViaServer';
import { formatMass, totalsFromRows } from '../logic/bomFormat';
import { currentStudioScript } from '../scriptSource';
import { ExportStatus } from './Shared/ExportStatus';
import { useCopyText } from './useCopyText';

export interface OrderSheetProps {
    readonly open: boolean;
    readonly onClose: () => void;
}

const BUTTON = 'inline-flex items-center gap-1.5 rounded border border-[#2b313c] bg-[#1a1a1a] px-2 py-1 text-[11px] text-gray-300 hover:bg-[#222] disabled:cursor-not-allowed disabled:opacity-50';
const CHIP = 'inline-flex items-center gap-1 rounded border border-amber-900/60 bg-amber-950/30 px-1.5 py-0.5 text-2xs leading-none text-amber-200/90';

export function OrderSheet({ open, onClose }: OrderSheetProps): JSX.Element {
    const { code } = useCode();
    const bom = useBom(code, true, currentStudioScript());
    const task = useExportTask();
    const { start } = task;

    const rows = bom.status === 'ready' ? bom.rows : EMPTY_ROWS;
    const handoffs = useMemo(() => buildHandoffs(rows), [rows]);
    const fastAddUrl = useMemo(() => digikeyFastAddUrl(handoffItems(rows)), [rows]);
    const made = useMemo(() => rows.filter((row) => row.kind === 'fabricated'), [rows]);
    const bought = useMemo(() => rows.filter((row) => row.kind === 'purchased'), [rows]);
    const groups = useMemo(() => FAB_PROCESSES
        .map((process) => ({ process, rows: made.filter((row) => row.process === process) }))
        .filter((group) => group.rows.length > 0), [made]);

    const busy = task.state.running !== null;

    const downloadPack = (process: FabProcess): void => {
        void start(`Order pack — ${process}`, (options) => exportViaServer('order-pack', code, {
            ...options,
            exportOptions: { processes: [process] },
        }), downloadBlob);
    };
    const downloadAll = (): void => {
        void start('Order pack — all', (options) => exportViaServer('order-pack', code, options), downloadBlob);
    };
    const downloadCsv = (): void => {
        void start('BOM CSV', (options) => exportViaServer('bom-csv', code, options), downloadBlob);
    };

    function body(): JSX.Element {
        if (bom.status === 'loading') {
            return (
                <div className="text-sm text-gray-500" data-testid="order-loading">
                    Computing bill of materials…
                </div>
            );
        }
        if (bom.status === 'error') {
            return (
                <div className="text-sm text-red-200" data-testid="order-error">
                    {bom.error ?? 'BOM computation failed.'}
                </div>
            );
        }
        if (bom.status !== 'ready' || rows.length === 0) {
            return (
                <div className="text-sm text-gray-500" data-testid="order-empty-state">
                    No assembly parts.
                </div>
            );
        }

        const totals = totalsFromRows(rows, bom.totals);
        const madeCount = quantityOf(made);
        const boughtCount = quantityOf(bought);
        const split = groups.map((group) => `${quantityOf(group.rows)} × ${group.process}`).join(', ');
        return (
            <div className="flex flex-col gap-4" data-testid="order-sheet">
                <div className="flex flex-col gap-1.5">
                    <p className="text-xs text-gray-200" data-testid="order-summary">
                        {madeCount} made{split.length > 0 ? ` — ${split}` : ''} · {boughtCount} bought
                    </p>
                    <p className="text-[11px] text-gray-500" data-testid="order-totals">
                        {totals.partCount} parts · {totals.uniquePartCount} unique ·{' '}
                        {totals.totalMassG === null ? 'mass unknown' : formatMass(totals.totalMassG)} · prices not included
                    </p>
                    <p className="text-[11px] text-amber-200/70" data-testid="order-notice">
                        Estimated scope only — no prices; nothing is sent from here.
                    </p>
                    <button type="button" disabled={busy} onClick={downloadAll} data-testid="order-pack-all" className={BUTTON}>
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Build order pack (all)
                    </button>
                </div>

                {groups.map((group) => (
                    <MadeGroup
                        key={group.process}
                        process={group.process}
                        rows={group.rows}
                        busy={busy}
                        onDownload={downloadPack}
                    />
                ))}

                <section className="flex flex-col gap-2" data-testid="order-bought">
                    <h3 className="text-2xs uppercase tracking-wide text-gray-500">Bought</h3>
                    {bought.length > 0 && (
                        <ul className="flex flex-col gap-1">
                            {bought.map((row) => (
                                <li key={row.item} className="flex items-center justify-between gap-2 text-[11px] text-gray-300">
                                    <span className="min-w-0 truncate">{row.name}</span>
                                    <span className="flex shrink-0 items-center gap-1.5">
                                        <span className="text-gray-400" data-testid={`order-row-pn-${row.item}`}>
                                            {row.catalog?.partNumber ?? 'no vendor PN'}
                                        </span>
                                        <span className="tabular-nums text-gray-400">× {row.quantity}</span>
                                        <RowState row={row} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <VendorRow
                        name="McMaster-Carr"
                        testId="order-bought-mcmaster"
                        copyTestId="order-copy-mcmaster"
                        text={handoffs.mcmaster}
                    >
                        <p className="text-2xs text-gray-500">Quantities mean packs — verify pack size.</p>
                    </VendorRow>
                    <VendorRow
                        name="Mouser"
                        testId="order-bought-mouser"
                        copyTestId="order-copy-mouser"
                        text={handoffs.mouser}
                    />
                    <VendorRow
                        name="DigiKey"
                        testId="order-bought-digikey"
                        copyTestId="order-copy-digikey"
                        text={handoffs.digikey}
                    >
                        {fastAddUrl !== null && (
                            <a href={fastAddUrl} target="_blank" rel="noreferrer" className="text-2xs text-blue-300/90 underline hover:text-blue-200">
                                Open DigiKey cart
                            </a>
                        )}
                    </VendorRow>
                    <button type="button" disabled={busy} onClick={downloadCsv} data-testid="order-bom-csv" className={BUTTON}>
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        Download BOM CSV
                    </button>
                </section>

                <ExportStatus task={task} testId="order-status" />
            </div>
        );
    }

    return (
        <Sheet open={open} onClose={onClose} side="right" width={420} title="Order parts">
            {body()}
        </Sheet>
    );
}

function MadeGroup({ process, rows, busy, onDownload }: {
    readonly process: FabProcess;
    readonly rows: readonly BomRow[];
    readonly busy: boolean;
    readonly onDownload: (process: FabProcess) => void;
}): JSX.Element {
    // One inferred row downgrades the group's process, so the whole group is
    // flagged: the shop quote below may be for the wrong process.
    const assumed = rows.some((row) => row.processSource === 'inferred');
    const links = servicesForProcess(process).map((service) => ({
        service,
        link: buildVendorLink(service.url, { surface: 'export' }),
    }));
    const disclosure = referralDisclosure(links.map((entry) => entry.link));
    return (
        <section className="rounded border border-[#1f1f1f] p-2.5" data-testid={`order-group-${process}`}>
            <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-xs font-semibold text-gray-200">
                    {process}
                    <span className="ml-1.5 font-normal text-gray-500">· {quantityOf(rows)}</span>
                    {assumed && (
                        <span className={`ml-1.5 ${CHIP}`} data-testid={`order-group-${process}-assumed`}>
                            assumed
                        </span>
                    )}
                </h3>
                <button type="button" disabled={busy} onClick={() => onDownload(process)}
                    data-testid={`order-pack-${process}`} className={BUTTON}>
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    Download pack
                </button>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1">
                {rows.map((row) => (
                    <li key={row.item} className="flex items-center justify-between gap-2 text-[11px] text-gray-300">
                        <span className="min-w-0 truncate">{row.name}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                            <span className="tabular-nums text-gray-400">× {row.quantity}</span>
                            <RowState row={row} />
                        </span>
                    </li>
                ))}
            </ul>
            {links.length > 0 && (
                <>
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-2xs text-gray-500">
                        <span>Quote:</span>
                        {links.map(({ service, link }) => (
                            <a key={service.service} href={link.url} target="_blank" rel="noreferrer"
                                className="text-blue-300/90 underline hover:text-blue-200">
                                {service.service}
                            </a>
                        ))}
                    </div>
                    {disclosure !== undefined && (
                        <p className="mt-1 text-2xs text-gray-500" data-testid={`order-referral-${process}`}>
                            {disclosure}
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

/** The per-line order blocker, if any: a purchased row with no vendor part
 *  number, or a fabricated row with no mass source. */
function RowState({ row }: { readonly row: BomRow }): JSX.Element | null {
    if (row.kind === 'purchased') {
        if (row.catalog?.partNumber) return null;
        const source = row.catalog?.source ?? null;
        return (
            <span className={CHIP} data-testid={`order-state-${row.item}`}>
                needs-vendor-pn
                {source !== null && (
                    <a href={source} target="_blank" rel="noreferrer" className="underline">source</a>
                )}
            </span>
        );
    }
    if (row.massGPerUnit === null) {
        return <span className={CHIP} data-testid={`order-state-${row.item}`}>needs-material</span>;
    }
    return null;
}

function VendorRow({ name, testId, copyTestId, text, children }: {
    readonly name: string;
    readonly testId: string;
    readonly copyTestId: string;
    readonly text: string | null;
    readonly children?: ReactNode;
}): JSX.Element {
    const { state, copy } = useCopyText();
    return (
        <div className="rounded border border-[#1f1f1f] px-2.5 py-2" data-testid={testId}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-200">{name}</span>
                <button type="button" disabled={text === null} data-testid={copyTestId}
                    onClick={() => { if (text !== null) void copy(text); }} className={BUTTON}>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
                </button>
            </div>
            {text !== null && (
                <pre className="mt-1.5 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-[#141414] px-2 py-1.5 text-2xs leading-tight text-gray-400">{text}</pre>
            )}
            {children !== undefined && <div className="mt-1.5 flex flex-col gap-1">{children}</div>}
        </div>
    );
}

function quantityOf(rows: readonly BomRow[]): number {
    return rows.reduce((sum, row) => sum + row.quantity, 0);
}

const EMPTY_ROWS: readonly BomRow[] = [];

export default OrderSheet;
