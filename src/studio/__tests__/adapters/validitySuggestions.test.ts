// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, expect, it } from 'vitest';
import type { ValidatorDiagnostic, ValidatorResult } from '../../../modeling/mates/validator';
import { buildValiditySuggestions } from '../../adapters/validitySuggestions';

function makeValidity(
    status: ValidatorResult['status'],
    diagnostics: ValidatorDiagnostic[] = [],
): ValidatorResult {
    return {
        status,
        diagnostics,
        partCount: 2,
        jointCount: 1,
    };
}

describe('buildValiditySuggestions', () => {
    it('returns no suggestions when validity and mechanismBanner are both null', () => {
        expect(
            buildValiditySuggestions({
                validity: null,
                mechanismBanner: null,
            }),
        ).toEqual([]);
    });

    it('returns no suggestions for solved validity with no mechanism failures', () => {
        expect(
            buildValiditySuggestions({
                validity: makeValidity('solved'),
                mechanismBanner: null,
            }),
        ).toEqual([]);
    });

    it('puts mechanism failures before diagnostic suggestions and maps partName targets', () => {
        const diagnostic: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'warning',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        const suggestions = buildValiditySuggestions({
            validity: makeValidity('warning', [diagnostic]),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect the actuator to the output link',
                    },
                ],
            },
        });

        expect(suggestions).toMatchObject([
            {
                id: 'mechanism:mechanism.disconnect:0',
                kind: 'mechanism',
                severity: 'error',
                title: 'Fix broken mechanism',
                evidence: 'drive chain is disconnected',
                action: 'connect the actuator to the output link',
                targetLabel: null,
                targetId: null,
                code: 'mechanism.disconnect',
            },
            {
                id: 'diagnostic:assembly.part.floating:output-horn:0',
                kind: 'diagnostic',
                severity: 'warning',
                title: 'Fix output-horn',
                evidence: 'output-horn floats',
                action: 'add a mate to output-horn',
                targetLabel: 'output-horn',
                targetId: 'output-horn',
                code: 'assembly.part.floating',
            },
        ]);
    });

    it('uses the trimmed backend suggestedRepairPrompt for every card promptText', () => {
        const diagnostic: ValidatorDiagnostic = {
            code: 'assembly.part.floating',
            severity: 'warning',
            message: 'output-horn floats',
            hint: 'add a mate to output-horn',
            partName: 'output-horn',
        };

        const suggestions = buildValiditySuggestions({
            validity: makeValidity('warning', [diagnostic]),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect the actuator to the output link',
                    },
                ],
            },
            suggestedRepairPrompt: '  Rebuild the linkage as one connected revolute chain.  ',
        });

        expect(suggestions.map((suggestion) => suggestion.promptText)).toEqual([
            'Rebuild the linkage as one connected revolute chain.',
            'Rebuild the linkage as one connected revolute chain.',
        ]);
    });

    it('falls back to prompt text built from fallback-resolved evidence and action', () => {
        const suggestions = buildValiditySuggestions({
            validity: makeValidity('error', [
                {
                    code: 'assembly.loop.unclosed',
                    severity: 'warning',
                    message: '',
                    hint: '',
                },
            ]),
            mechanismBanner: null,
            suggestedRepairPrompt: '   ',
        });

        expect(suggestions[0]).toMatchObject({
            evidence: 'assembly.loop.unclosed',
            action: 'Review deterministic validation evidence.',
            promptText:
                'Fix assembly.loop.unclosed: assembly.loop.unclosed Action: Review deterministic validation evidence.',
        });
    });

    it('honors limit=1 and maps pair diagnostics to label and primary selection id', () => {
        const diagnostic: ValidatorDiagnostic = {
            code: 'assembly.interference.overlap',
            severity: 'error',
            message: 'bracket collides with cover',
            hint: 'move the cover clear of the bracket',
            partA: 'bracket',
            partB: 'cover',
        };

        const suggestions = buildValiditySuggestions({
            validity: makeValidity('error', [diagnostic]),
            mechanismBanner: null,
            limit: 1,
        });

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toMatchObject({
            id: 'diagnostic:assembly.interference.overlap:bracket:0',
            targetLabel: 'bracket ↔ cover',
            targetId: 'bracket',
        });
    });

    it('uses a default limit of 3 when more suggestions exist', () => {
        const suggestions = buildValiditySuggestions({
            validity: makeValidity('error', [
                {
                    code: 'assembly.part.floating',
                    severity: 'error',
                    message: 'link floats',
                    hint: 'anchor link',
                    partName: 'link',
                },
                {
                    code: 'assembly.loop.unclosed',
                    severity: 'warning',
                    message: 'loop is open',
                    hint: 'close loop',
                },
            ]),
            mechanismBanner: {
                entries: [
                    {
                        code: 'mechanism.disconnect',
                        message: 'drive chain is disconnected',
                        hint: 'connect drive chain',
                    },
                    {
                        code: 'mechanism.orphan-part',
                        message: 'part is orphaned',
                        hint: 'connect orphaned part',
                    },
                ],
            },
        });

        expect(suggestions.map((suggestion) => suggestion.id)).toEqual([
            'mechanism:mechanism.disconnect:0',
            'mechanism:mechanism.orphan-part:1',
            'diagnostic:assembly.part.floating:link:0',
        ]);
    });

    it('maps target precedence for partName, mateName, partA, and no target', () => {
        const suggestions = buildValiditySuggestions({
            validity: makeValidity('error', [
                {
                    code: 'assembly.part.floating',
                    severity: 'error',
                    message: 'link floats',
                    hint: 'anchor link',
                    partName: 'link',
                    mateName: 'link-mate',
                },
                {
                    code: 'assembly.mate.over-constrained',
                    severity: 'warning',
                    message: 'mate is over-constrained',
                    hint: 'remove duplicate mate',
                    mateName: 'jaw-coupling',
                },
                {
                    code: 'assembly.interference.overlap',
                    severity: 'error',
                    message: 'bracket overlaps',
                    hint: 'move bracket',
                    partA: 'bracket',
                },
                {
                    code: 'assembly.loop.unclosed',
                    severity: 'warning',
                    message: 'loop is open',
                    hint: 'close loop',
                },
            ]),
            mechanismBanner: null,
            limit: 4,
        });

        expect(
            suggestions.map((suggestion) => ({
                title: suggestion.title,
                targetLabel: suggestion.targetLabel,
                targetId: suggestion.targetId,
            })),
        ).toEqual([
            { title: 'Fix link', targetLabel: 'link', targetId: 'link' },
            { title: 'Fix jaw-coupling', targetLabel: 'jaw-coupling', targetId: 'jaw-coupling' },
            { title: 'Fix bracket', targetLabel: 'bracket', targetId: 'bracket' },
            { title: 'Resolve assembly.loop.unclosed', targetLabel: null, targetId: null },
        ]);
    });

    it('uses diagnostic fallbacks for empty message and hint with no target', () => {
        const suggestions = buildValiditySuggestions({
            validity: makeValidity('error', [
                {
                    code: 'assembly.loop.unclosed',
                    severity: 'warning',
                    message: '',
                    hint: '',
                },
            ]),
            mechanismBanner: null,
        });

        expect(suggestions[0]).toMatchObject({
            title: 'Resolve assembly.loop.unclosed',
            evidence: 'assembly.loop.unclosed',
            action: 'Review deterministic validation evidence.',
            targetLabel: null,
            targetId: null,
        });
    });
});
