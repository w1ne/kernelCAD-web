// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { AgentComposer } from '../AgentComposer';

function Harness({ submit = vi.fn() }: { submit?: (prompt: string, referenceImage?: unknown) => void }) {
    const [value, setValue] = useState('');
    return <AgentComposer value={value} onChange={setValue} onSubmit={submit} />;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('AgentComposer', () => {
    it('offers one text box and submits the trimmed message', () => {
        const submit = vi.fn();
        render(<Harness submit={submit} />);
        expect(screen.getAllByRole('textbox')).toHaveLength(1);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: '  make a bracket  ' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit).toHaveBeenCalledWith('make a bracket');
        expect(screen.getByRole('button', { name: 'Include files' })).toBeDefined();
    });
    it('includes file contents and lets the user remove attachments', async () => {
        const submit = vi.fn();
        render(<Harness submit={submit} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Build this' } });
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File(['Width: 40 mm'], 'dimensions.txt', { type: 'text/plain' })] },
        });
        await screen.findByRole('button', { name: 'Remove dimensions.txt' });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit.mock.calls[0][0]).toContain('Width: 40 mm');
        expect(submit.mock.calls[0][0]).toContain('dimensions.txt');
        fireEvent.click(screen.getByRole('button', { name: 'Remove dimensions.txt' }));
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit).toHaveBeenLastCalledWith('Build this');
    });
    it('rejects unsupported files instead of pretending to attach them', async () => {
        render(<Harness />);
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File(['binary'], 'part.stl', { type: 'application/octet-stream' })] },
        });
        expect((await screen.findByRole('alert')).textContent).toContain('text');
    });
    it('appends Chrome dictation without submitting and aborts on unmount', async () => {
        const speech = { start: vi.fn(), stop: vi.fn(), abort: vi.fn(), onresult: null as any, onend: null as any, onerror: null as any };
        vi.stubGlobal('webkitSpeechRecognition', class { constructor() { return speech; } });
        const submit = vi.fn();
        const { unmount } = render(<Harness submit={submit} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Make a bracket' } });
        fireEvent.click(screen.getByRole('button', { name: 'Voice input' }));
        expect(speech.start).toHaveBeenCalledOnce();
        act(() => speech.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'with four holes' } }] }));
        await waitFor(() => expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Make a bracket with four holes'));
        expect(submit).not.toHaveBeenCalled();
        unmount();
        expect(speech.abort).toHaveBeenCalled();
    });
    it('submits an attached photo as a reference image, not as prompt text', async () => {
        const submit = vi.fn();
        render(<Harness submit={submit} />);
        fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Build this e-reader' } });
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File([new Uint8Array([137, 80, 78, 71])], 'device.png', { type: 'image/png' })] },
        });
        await screen.findByRole('button', { name: 'Remove device.png' });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit).toHaveBeenCalledWith('Build this e-reader', {
            dataUrl: expect.stringMatching(/^data:image\/png;base64,/),
            fileName: 'device.png',
            mimeType: 'image/png',
        });
        expect(submit.mock.calls[0][0]).not.toContain('data:image');
        fireEvent.click(screen.getByRole('button', { name: 'Remove device.png' }));
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect(submit).toHaveBeenLastCalledWith('Build this e-reader');
    });
    it('rejects a second photo', async () => {
        render(<Harness />);
        const chooser = screen.getByLabelText('Choose files');
        fireEvent.change(chooser, {
            target: { files: [new File(['first'], 'first.png', { type: 'image/png' })] },
        });
        await screen.findByRole('button', { name: 'Remove first.png' });
        fireEvent.change(chooser, {
            target: { files: [new File(['second'], 'second.png', { type: 'image/png' })] },
        });
        expect((await screen.findByRole('alert')).textContent).toContain('One photo per build.');
    });
    it('rejects photos larger than four MiB', async () => {
        render(<Harness />);
        fireEvent.change(screen.getByLabelText('Choose files'), {
            target: { files: [new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'huge.png', { type: 'image/png' })] },
        });
        expect((await screen.findByRole('alert')).textContent).toContain('4 MiB');
    });
    it('shows microphone permission failures', () => {
        const speech = { start: vi.fn(), stop: vi.fn(), abort: vi.fn(), onerror: null as any };
        vi.stubGlobal('webkitSpeechRecognition', class { constructor() { return speech; } });
        render(<Harness />);
        fireEvent.click(screen.getByRole('button', { name: 'Voice input' }));
        act(() => speech.onerror({ error: 'not-allowed' }));
        expect(screen.getByRole('alert').textContent).toContain('microphone');
    });
});
