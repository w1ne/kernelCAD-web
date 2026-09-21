// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { render, renderHook, act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../LLMService', () => ({
    llmService: {
        getApiKey: vi.fn(),
        setApiKey: vi.fn(),
        sendMessage: vi.fn(),
        generateVariations: vi.fn(),
    },
}));

vi.mock('../../../../agent/api', () => ({
    agentAPI: { evaluateCode: vi.fn() },
}));

vi.mock('../../../context/WorkbenchContext', () => ({
    useWorkbench: () => ({
        code: 'const width = 10;',
        insertCode: vi.fn(),
        selectedItemId: 'box1',
        applyCodeSafe: vi.fn(),
    }),
}));

import { useAIAssistantChat } from '../useAIAssistantChat';
import { llmService } from '../LLMService';
import { agentAPI } from '../../../../agent/api';

const mockGetApiKey = vi.mocked(llmService.getApiKey);
const mockSetApiKey = vi.mocked(llmService.setApiKey);
const mockSendMessage = vi.mocked(llmService.sendMessage);
const mockGenerateVariations = vi.mocked(llmService.generateVariations);
const mockEvaluateCode = vi.mocked(agentAPI.evaluateCode);

describe('useAIAssistantChat', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetApiKey.mockReturnValue(null);
        mockSendMessage.mockResolvedValue('model reply');
        mockGenerateVariations.mockResolvedValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts idle with settings hidden when an API key is stored', () => {
        mockGetApiKey.mockReturnValue('key-123');
        const { result } = renderHook(() => useAIAssistantChat());

        expect(result.current.messages).toEqual([]);
        expect(result.current.input).toBe('');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.apiKey).toBe('key-123');
        expect(result.current.showSettings).toBe(false);
        expect(result.current.style).toBe('Standard');
    });

    it('opens settings when no API key is stored', () => {
        mockGetApiKey.mockReturnValue(null);
        const { result } = renderHook(() => useAIAssistantChat());

        expect(result.current.apiKey).toBe('');
        expect(result.current.showSettings).toBe(true);
    });

    it('handleSend ignores a blank input', async () => {
        const { result } = renderHook(() => useAIAssistantChat());
        await act(async () => { await result.current.handleSend(); });

        expect(mockSendMessage).not.toHaveBeenCalled();
        expect(result.current.messages).toEqual([]);
    });

    it('handleSend appends user + model messages and passes workbench context', async () => {
        const { result } = renderHook(() => useAIAssistantChat());
        act(() => { result.current.setInput('make a box'); });

        await act(async () => { await result.current.handleSend(); });

        expect(mockSendMessage).toHaveBeenCalledWith(
            [{ role: 'user', content: 'make a box' }],
            { code: 'const width = 10;', selectedId: 'box1', style: 'Standard' },
        );
        expect(result.current.messages).toEqual([
            { role: 'user', content: 'make a box' },
            { role: 'model', content: 'model reply' },
        ]);
        expect(result.current.input).toBe('');
        expect(result.current.isLoading).toBe(false);
    });

    it('handleSend pins the **Error** message prefix on failure', async () => {
        mockSendMessage.mockRejectedValue(new Error('boom'));
        const { result } = renderHook(() => useAIAssistantChat());
        act(() => { result.current.setInput('make a box'); });

        await act(async () => { await result.current.handleSend(); });

        expect(result.current.messages).toEqual([
            { role: 'user', content: 'make a box' },
            { role: 'model', content: '**Error**: boom' },
        ]);
        expect(result.current.isLoading).toBe(false);
    });

    it('handleGenerateVariations pins the emoji prompt and the JSON-encoded variations', async () => {
        const variations = [{ name: 'V1', code: 'return 1;', description: 'first' }];
        mockGenerateVariations.mockResolvedValue(variations);
        const { result } = renderHook(() => useAIAssistantChat());
        act(() => { result.current.setInput('gear'); });

        await act(async () => { await result.current.handleGenerateVariations(); });

        expect(mockGenerateVariations).toHaveBeenCalledWith(
            'gear',
            { code: 'const width = 10;', style: 'Standard' },
        );
        expect(result.current.messages).toEqual([
            { role: 'user', content: '✨ Generate Variations: gear' },
            { role: 'model', content: JSON.stringify(variations) },
        ]);
        expect(result.current.input).toBe('');
        expect(result.current.isLoading).toBe(false);
    });

    it('handleFileSelect reads the picked image and sends it with the [Image Uploaded] prefix', async () => {
        function Harness() {
            const chat = useAIAssistantChat();
            return (
                <>
                    <input
                        aria-label="prompt"
                        value={chat.input}
                        onChange={(e) => chat.setInput(e.target.value)}
                    />
                    <input data-testid="file-input" type="file" onChange={chat.handleFileSelect} />
                </>
            );
        }

        render(<Harness />);
        const file = new File(['fake-image'], 'photo.png', { type: 'image/png' });

        fireEvent.change(screen.getByLabelText('prompt'), { target: { value: 'describe this' } });
        fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } });

        await waitFor(() => {
            expect(mockSendMessage).toHaveBeenCalledWith(
                [{ role: 'user', content: '[Image Uploaded] describe this' }],
                {
                    code: 'const width = 10;',
                    selectedId: 'box1',
                    style: 'Standard',
                    image: expect.stringContaining('data:image/png;base64,'),
                },
            );
        });
    });

    it('handleSaveKey stores the key and closes settings', () => {
        const { result } = renderHook(() => useAIAssistantChat());
        act(() => {
            result.current.setApiKey('new-key');
            result.current.setShowSettings(true);
        });

        act(() => { result.current.handleSaveKey(); });

        expect(mockSetApiKey).toHaveBeenCalledWith('new-key');
        expect(result.current.showSettings).toBe(false);
    });

    it('handleRunCode logs and alerts with the pinned failure text', async () => {
        mockEvaluateCode.mockRejectedValue(new Error('bad code'));
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        const { result } = renderHook(() => useAIAssistantChat());

        await act(async () => { await result.current.handleRunCode('return 1;'); });

        expect(mockEvaluateCode).toHaveBeenCalledWith('return 1;');
        expect(consoleError).toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith('Execution failed: bad code');
    });
});
