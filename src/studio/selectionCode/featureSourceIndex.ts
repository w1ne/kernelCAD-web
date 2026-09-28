// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/**
 * Feature ↔ source-range index for the selection ↔ code link.
 *
 * `FeatureRecord.scriptLocation` is the call site the capture runtime
 * recorded: the 1-based line/column of the callee name (`box` in `box(…)`,
 * `fillet` in `body.fillet(…)`). This module parses the editor source once
 * per (evaluation, source) pair and turns each location into:
 *   - `callRange`: the callee name through the closing parenthesis, the range
 *     the Code tab decorates;
 *   - `statementRange`: the enclosing statement, so a cursor anywhere on
 *     `const plate = box(…).hole(…)` finds every feature that statement makes.
 *
 * A location that does not land on a callee in the current source (the buffer
 * was edited after the evaluation) gets no call range. It degrades to a
 * whole-line range rather than to a plausible-looking wrong call.
 */
import type * as acorn from 'acorn';
import * as walk from 'acorn-walk';
import { parseCode } from '../../shared/codeGeneration/ast';
import type { FeatureRecord } from '../../shared/intent/featureRecord';

/** 1-based, end-exclusive column range (Monaco `IRange` shape). */
export interface SourceRange {
    readonly startLineNumber: number;
    readonly startColumn: number;
    readonly endLineNumber: number;
    readonly endColumn: number;
}

export interface FeatureSourceEntry {
    readonly featureId: string;
    readonly kind: string;
    /** Author-facing name: `metadata.name` / part name, else undefined. */
    readonly name?: string;
    readonly line: number;
    /** Callee through closing paren. Undefined when the location did not
     *  resolve to a call in the current source. */
    readonly callRange?: SourceRange;
    /** Innermost statement holding the call (or the whole line). */
    readonly statementRange: SourceRange;
}

export interface FeatureSourceIndex {
    readonly entries: readonly FeatureSourceEntry[];
    readonly byFeatureId: ReadonlyMap<string, FeatureSourceEntry>;
}

interface LocNode extends acorn.Node {
    loc: acorn.SourceLocation;
}

interface CallSite {
    call: LocNode;
    statement: LocNode | undefined;
}

function toRange(node: LocNode, from?: acorn.Position): SourceRange {
    const start = from ?? node.loc.start;
    return {
        startLineNumber: start.line,
        startColumn: start.column + 1,
        endLineNumber: node.loc.end.line,
        endColumn: node.loc.end.column + 1,
    };
}

function lineRange(lines: readonly string[], line: number): SourceRange {
    const text = lines[line - 1] ?? '';
    return { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: text.length + 1 };
}

/** Position of the callee name acorn nodes carry for a call: the identifier
 *  itself, or the property of a member callee. */
function calleeNamePosition(call: acorn.CallExpression): acorn.Position | undefined {
    const callee = call.callee as LocNode & { type: string; property?: LocNode };
    if (callee.type === 'Identifier') return callee.loc.start;
    if (callee.type === 'MemberExpression' && callee.property) return callee.property.loc.start;
    return undefined;
}

const isStatement = (node: acorn.Node): boolean =>
    /Statement$|Declaration$/.test(node.type) && node.type !== 'BlockStatement';

/** Every call in the source, keyed by `line:column` (1-based) of its callee
 *  name. Null when the source does not parse. */
function collectCallSites(code: string): Map<string, CallSite> | null {
    let ast: acorn.Node;
    try {
        ast = parseCode(code);
    } catch {
        return null;
    }
    const sites = new Map<string, CallSite>();
    walk.ancestor(ast, {
        CallExpression(node, _state, ancestors) {
            const call = node as acorn.CallExpression & LocNode;
            const pos = calleeNamePosition(call);
            if (!pos) return;
            let statement: LocNode | undefined;
            for (let i = ancestors.length - 2; i >= 0; i--) {
                if (isStatement(ancestors[i]!)) {
                    statement = ancestors[i] as LocNode;
                    break;
                }
            }
            sites.set(`${pos.line}:${pos.column + 1}`, { call, statement });
        },
    });
    return sites;
}

function authoredName(record: FeatureRecord): string | undefined {
    const meta = (record.metadata ?? {}) as { name?: unknown; partName?: unknown };
    if (typeof meta.name === 'string' && meta.name !== '') return meta.name;
    if (typeof meta.partName === 'string' && meta.partName !== '') return meta.partName;
    return undefined;
}

/** Build the index for one source text and one evaluation's records. */
export function buildFeatureSourceIndex(
    code: string,
    features: readonly FeatureRecord[],
): FeatureSourceIndex {
    const sites = collectCallSites(code);
    const lines = code.split('\n');
    const entries: FeatureSourceEntry[] = [];
    for (const record of features) {
        const loc = record.scriptLocation;
        if (!loc || loc.line < 1) continue;
        const site = sites?.get(`${loc.line}:${loc.column}`);
        const name = authoredName(record);
        const callRange = site
            ? toRange(site.call, calleeNamePosition(site.call as acorn.CallExpression))
            : undefined;
        entries.push({
            featureId: record.id,
            kind: record.kind,
            ...(name !== undefined ? { name } : {}),
            line: loc.line,
            ...(callRange !== undefined ? { callRange } : {}),
            statementRange: site?.statement ? toRange(site.statement) : lineRange(lines, loc.line),
        });
    }
    return { entries, byFeatureId: new Map(entries.map((e) => [e.featureId, e])) };
}

const indexCache = new WeakMap<readonly FeatureRecord[], { code: string; index: FeatureSourceIndex }>();

/**
 * Cached `buildFeatureSourceIndex`. The cache is keyed on the evaluation's
 * `features` array (a new array per evaluation) and the source text, so a
 * re-evaluation or an edit rebuilds it and nothing else does.
 */
export function getFeatureSourceIndex(
    code: string,
    features: readonly FeatureRecord[],
): FeatureSourceIndex {
    const hit = indexCache.get(features);
    if (hit && hit.code === code) return hit.index;
    const index = buildFeatureSourceIndex(code, features);
    indexCache.set(features, { code, index });
    return index;
}

function contains(r: SourceRange, line: number, column: number): boolean {
    if (line < r.startLineNumber || line > r.endLineNumber) return false;
    if (line === r.startLineNumber && column < r.startColumn) return false;
    if (line === r.endLineNumber && column > r.endColumn) return false;
    return true;
}

/** Ordering key for "smallest range": line span first, then column span. */
function size(r: SourceRange): number {
    return (r.endLineNumber - r.startLineNumber) * 100_000 + (r.endColumn - r.startColumn);
}

function sameRange(a: SourceRange, b: SourceRange): boolean {
    return a.startLineNumber === b.startLineNumber && a.startColumn === b.startColumn
        && a.endLineNumber === b.endLineNumber && a.endColumn === b.endColumn;
}

/** Entries whose `pick` range is the innermost one containing the position. */
function innermost(
    entries: readonly FeatureSourceEntry[],
    line: number,
    column: number,
    pick: (e: FeatureSourceEntry) => SourceRange | undefined,
): string[] {
    let best: SourceRange | undefined;
    for (const e of entries) {
        const r = pick(e);
        if (r && contains(r, line, column) && (!best || size(r) < size(best))) best = r;
    }
    if (!best) return [];
    const winner = best;
    return entries.filter((e) => {
        const r = pick(e);
        return r !== undefined && sameRange(r, winner);
    }).map((e) => e.featureId);
}

/**
 * Feature ids the source position (1-based line/column) points at: the
 * innermost call containing it, else every feature of the innermost
 * statement containing it. Several records can share one call site (a call
 * in a loop or a helper), so this returns all of them.
 */
export function featuresAtPosition(
    index: FeatureSourceIndex,
    line: number,
    column: number,
): string[] {
    const byCall = innermost(index.entries, line, column, (e) => e.callRange);
    if (byCall.length > 0) return byCall;
    return innermost(index.entries, line, column, (e) => e.statementRange);
}

/** Short label for a feature: "fillet · line 42" (name wins over kind). */
export function featureLabel(entry: FeatureSourceEntry): string {
    return `${entry.name ?? entry.kind} · line ${entry.line}`;
}
