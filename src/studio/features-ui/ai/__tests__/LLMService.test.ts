// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMService } from '../LLMService';

// Mock fetch global
const globalFetch = global.fetch;

describe('LLMService', () => {
    let llmService: LLMService;

    beforeEach(() => {
        llmService = new LLMService();
        llmService.setApiKey('test-key');
        global.fetch = vi.fn() as any;
    });

    afterEach(() => {
        global.fetch = globalFetch; // Restore
        vi.restoreAllMocks();
    });

    it('should generate variations and parse JSON correctly', async () => {
        const mockVariations = [
            { name: 'V1', code: 'code1', description: 'desc1' },
            { name: 'V2', code: 'code2', description: 'desc2' },
            { name: 'V3', code: 'code3', description: 'desc3' }
        ];

        // Mock LLM response
        const mockResponse = {
            ok: true,
            json: async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify(mockVariations)
                    }
                }]
            })
        };

        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await llmService.generateVariations('test prompt');

        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('V1');
        expect(result[0].code).toBe('code1');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.x.ai/v1/chat/completions',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Authorization': 'Bearer test-key'
                })
            })
        );
    });

    it('should handle markdown code blocks in JSON response', async () => {
        const mockVariations = [{ name: 'V1', code: 'c', description: 'd' }];
        const jsonContent = `\`\`\`json
${JSON.stringify(mockVariations)}
\`\`\``;

        const mockResponse = {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: jsonContent } }]
            })
        };

        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await llmService.generateVariations('prompt');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('V1');
    });

    it('should throw error on invalid JSON', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "Not JSON" } }]
            })
        };

        (global.fetch as any).mockResolvedValue(mockResponse);

        await expect(llmService.generateVariations('prompt')).rejects.toThrow('Failed to generate valid variations');
    });

    it('should construct vision payload when image is provided', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "I see a box" } }]
            })
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        await llmService.sendMessage(
            [{ role: 'user', content: 'Describe this' }],
            { image: 'data:image/png;base64,abc' }
        );

        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.x.ai/v1/chat/completions',
            expect.objectContaining({
                body: expect.stringContaining('"model":"grok-2-vision-1212"'),
            })
        );

        // Check if body contains image_url
        const callArgs = (global.fetch as any).mock.calls[0];
        const bodyValue = JSON.parse(callArgs[1].body);
        const lastMessage = bodyValue.messages[bodyValue.messages.length - 1];

        expect(lastMessage.role).toBe('user');
        expect(lastMessage.content).toEqual(expect.arrayContaining([
            { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } }
        ]));
    });

    it('should reject generated code with forbidden patterns', async () => {
        const mockResponse = {
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "const s = replicad.union(a, b); return s;" } }]
            })
        };
        (global.fetch as any).mockResolvedValue(mockResponse);

        const result = await llmService.sendMessage([{ role: 'user', content: 'test' }]);

        expect(result).toContain('Generation Rejected');
        expect(result).toContain('replicad.union is not supported');
    });
});
