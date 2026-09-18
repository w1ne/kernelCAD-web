// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect } from 'react';
import type { CodeMutationService } from '../../shared/codeGeneration/CodeMutationService';

/**
 * Watches the source for a finished `// @ai:<instruction>` magic comment and
 * swaps in a processing placeholder before asking the LLM for the generated
 * code; replaces the placeholder with the result (or an error marker).
 */
export function useMagicCommentDetection(code: string, mutationService: CodeMutationService) {
    // Magic Comment Detection
    useEffect(() => {
        const magicCommentRegex = /\/\/ @ai:(.+)(\n|$)/;
        const match = code.match(magicCommentRegex);

        if (match) {
            const fullMatch = match[0];
            const instruction = match[1].trim();
            const isFinished = fullMatch.endsWith('\n');

            if (isFinished && instruction) {
                const processingPlaceholder = `// @ai-processing: ${instruction}...\n`;
                const newCodeWithPlaceholder = code.replace(fullMatch, processingPlaceholder);
                mutationService.replace(newCodeWithPlaceholder, 'magicComment.processing');

                import('../features-ui/ai/LLMService').then(async ({ llmService }) => {
                    try {
                        const contextCode = code.replace(fullMatch, '');
                        const prompt = `Generate code for: "${instruction}". return ONLY the code.`;
                        const response = await llmService.sendMessage(
                            [{ role: 'user', content: prompt }],
                            { code: contextCode }
                        );
                        const cleanCode = response.replace(/```javascript/g, '').replace(/```/g, '').trim();
                        mutationService.apply(
                            (prev) => prev.replace(processingPlaceholder, cleanCode + '\n'),
                            'magicComment.success',
                        );
                    } catch (error) {
                        console.error("Magic Comment Error:", error);
                        mutationService.apply(
                            (prev) => prev.replace(processingPlaceholder, `// @ai-error: Failed to generate for "${instruction}"\n`),
                            'magicComment.failure',
                        );
                    }
                });
            }
        }
    }, [code, mutationService]);
}
