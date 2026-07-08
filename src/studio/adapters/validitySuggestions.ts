// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ValidatorDiagnostic, ValidatorResult } from '../../modeling/mates/validator';
import type { StudioRepairEvidence } from '../types';

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
    readonly repairEvidence: StudioRepairEvidence | null;
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
    readonly repairEvidence?: StudioRepairEvidence | null;
}): ValiditySuggestionCard[] {
    const limit = input.limit ?? 3;
    const backendPrompt = normalizePrompt(input.suggestedRepairPrompt);
    const promptSource = backendPrompt == null ? 'fallback' : 'review';
    const repairEvidence = normalizeRepairEvidence(input.repairEvidence);
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
                repairEvidence: repairEvidenceForCardCode(repairEvidence, entry.code),
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
                repairEvidence: repairEvidenceForCardCode(repairEvidence, diag.code),
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

function normalizeRepairEvidence(value: StudioRepairEvidence | null | undefined): StudioRepairEvidence | null {
    const repairMode = normalizeRepairMode(value?.repairMode);
    const blockingReasons =
        value?.blockingReasons
            .map((reason) => ({
                code: normalizeEvidenceField(reason.code),
                message: normalizeEvidenceField(reason.message),
                repairHint: normalizeEvidenceField(reason.repairHint),
            }))
            .filter(
                (reason) =>
                    reason.code !== '' ||
                    reason.message !== '' ||
                    reason.repairHint !== '',
            ) ?? [];

    if (repairMode == null && blockingReasons.length === 0) return null;
    return { repairMode, blockingReasons };
}

function repairEvidenceForCardCode(
    value: StudioRepairEvidence | null,
    cardCode: string,
): StudioRepairEvidence | null {
    const blockingReasons = value?.blockingReasons.filter((reason) => reason.code === cardCode) ?? [];
    if (value == null || blockingReasons.length === 0) return null;
    return {
        repairMode: value.repairMode,
        blockingReasons,
    };
}

function normalizeRepairMode(value: string | null | undefined): string | null {
    const normalized = normalizePrompt(value);
    if (normalized == null) return null;
    return normalized.toLowerCase() === 'none' ? null : normalized;
}

function normalizeEvidenceField(value: string | null | undefined): string {
    return value?.trim() ?? '';
}

function fallbackPrompt(code: string, evidence: string, action: string): string {
    return `Fix ${code}: ${evidence} Action: ${action}`;
}
