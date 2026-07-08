// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ValidatorDiagnostic, ValidatorResult } from '../../modeling/mates/validator';

export interface ValiditySuggestionCard {
    readonly id: string;
    readonly kind: 'mechanism' | 'diagnostic';
    readonly severity: 'error' | 'warning' | 'info';
    readonly title: string;
    readonly evidence: string;
    readonly action: string;
    readonly targetLabel: string | null;
    readonly targetId: string | null;
    readonly code: string;
    readonly promptText: string;
    readonly promptSource: 'review' | 'fallback';
}

export function buildValiditySuggestions(input: {
    readonly validity: ValidatorResult | null;
    readonly mechanismBanner: {
        readonly entries: ReadonlyArray<{
            readonly code: string;
            readonly message: string;
            readonly hint: string;
        }>;
    } | null;
    readonly limit?: number;
    readonly suggestedRepairPrompt?: string | null;
}): ValiditySuggestionCard[] {
    const limit = input.limit ?? 3;
    const backendPrompt = normalizePrompt(input.suggestedRepairPrompt);
    const promptSource = backendPrompt == null ? 'fallback' : 'review';
    const mechanismCards =
        input.mechanismBanner?.entries.map((entry, index): ValiditySuggestionCard => {
            const evidence = textOrFallback(entry.message, entry.code);
            const action = textOrFallback(entry.hint, 'Review deterministic validation evidence.');
            return {
                id: `mechanism:${entry.code}:${index}`,
                kind: 'mechanism',
                severity: 'error',
                title: 'Fix broken mechanism',
                evidence,
                action,
                targetLabel: null,
                targetId: null,
                code: entry.code,
                promptText: backendPrompt ?? fallbackPrompt(entry.code, evidence, action),
                promptSource,
            };
        }) ?? [];
    const diagnosticCards =
        input.validity?.diagnostics.map((diag, index): ValiditySuggestionCard => {
            const targetLabel = diagnosticTargetLabel(diag);
            const targetId = diagnosticTargetId(diag);
            const evidence = textOrFallback(diag.message, diag.code);
            const action = textOrFallback(diag.hint, 'Review deterministic validation evidence.');
            return {
                id: `diagnostic:${diag.code}:${targetId ?? 'global'}:${index}`,
                kind: 'diagnostic',
                severity: diag.severity,
                title: targetLabel != null ? `Fix ${targetLabel}` : `Resolve ${diag.code}`,
                evidence,
                action,
                targetLabel,
                targetId,
                code: diag.code,
                promptText: backendPrompt ?? fallbackPrompt(diag.code, evidence, action),
                promptSource,
            };
        }) ?? [];

    return [...mechanismCards, ...diagnosticCards].slice(0, limit);
}

function diagnosticTargetLabel(d: ValidatorDiagnostic): string | null {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
    if (d.partA && d.partB) return `${d.partA} ↔ ${d.partB}`;
    if (d.partA) return d.partA;
    return null;
}

function diagnosticTargetId(d: ValidatorDiagnostic): string | null {
    if (d.partName) return d.partName;
    if (d.mateName) return d.mateName;
    if (d.partA) return d.partA;
    return null;
}

function textOrFallback(value: string, fallback: string): string {
    return value.trim() === '' ? fallback : value;
}

function normalizePrompt(value: string | null | undefined): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
}

function fallbackPrompt(code: string, evidence: string, action: string): string {
    return `Fix ${code}: ${evidence} Action: ${action}`;
}
