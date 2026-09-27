// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import { FeedbackModal } from './FeedbackModal';
import { postFeedback, FEEDBACK_ENDPOINT, type FeedbackPayload } from './feedbackApi';
import { FeedbackButton } from './FeedbackButton';
import { useOptionalSession } from '../../../funnel/hooks/useSession';

vi.mock('../../../funnel/hooks/useSession', () => ({
    useOptionalSession: vi.fn(),
}));

const mockSession = vi.mocked(useOptionalSession);

function signedIn(): void {
    mockSession.mockReturnValue({
        session: { user: { id: 'user-123', email: 'ada@example.com' } } as unknown as Session,
        loading: false,
    });
}

const MESSAGE = 'Fillet on the lid edge fails silently.';

function typeMessage(text = MESSAGE): void {
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: text } });
}

beforeEach(() => {
    mockSession.mockReturnValue({ session: null, loading: false });
    Object.defineProperty(window, 'location', {
        configurable: true,
        value: { pathname: '/p/demo-box', search: '', hostname: 'localhost' },
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('FeedbackModal', () => {
    it('renders nothing while closed', () => {
        render(<FeedbackModal open={false} onClose={() => {}} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('signed out: sends message, category, optional email, path and version', async () => {
        const submit = vi.fn<(p: FeedbackPayload) => Promise<void>>().mockResolvedValue();
        render(<FeedbackModal open onClose={() => {}} submitFeedback={submit} />);

        typeMessage();
        fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'modeling' } });
        fireEvent.change(screen.getByLabelText(/Reply email/), { target: { value: 'me@example.com' } });
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));

        await screen.findByRole('status');
        expect(submit).toHaveBeenCalledTimes(1);
        const payload = submit.mock.calls[0][0];
        expect(payload).toMatchObject({
            message: MESSAGE,
            category: 'modeling',
            email: 'me@example.com',
            path: '/p/demo-box',
            honeypot: '',
        });
        expect(payload.userId).toBeUndefined();
        expect(payload.appVersion).toBeTruthy();
    });

    it('signed in: hides the email field and attaches the user id and email', async () => {
        signedIn();
        const submit = vi.fn<(p: FeedbackPayload) => Promise<void>>().mockResolvedValue();
        render(<FeedbackModal open onClose={() => {}} submitFeedback={submit} />);

        expect(screen.queryByLabelText(/Reply email/)).toBeNull();
        expect(screen.getByTestId('feedback-signed-in-as').textContent).toContain('ada@example.com');

        typeMessage();
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        await screen.findByRole('status');
        expect(submit.mock.calls[0][0]).toMatchObject({
            userId: 'user-123',
            userEmail: 'ada@example.com',
            email: undefined,
        });
    });

    it('keeps Send disabled until the message has 10 characters', () => {
        render(<FeedbackModal open onClose={() => {}} submitFeedback={vi.fn()} />);
        const send = screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement;
        expect(send.disabled).toBe(true);
        typeMessage('short');
        expect(send.disabled).toBe(true);
        typeMessage('long enough now');
        expect(send.disabled).toBe(false);
    });

    it('shows the error and keeps the form when submit fails', async () => {
        const submit = vi.fn().mockRejectedValue(new Error('Too many submissions. Try again later.'));
        render(<FeedbackModal open onClose={() => {}} submitFeedback={submit} />);
        typeMessage();
        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        expect((await screen.findByRole('alert')).textContent).toContain('Too many submissions');
        expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe(MESSAGE);
    });

    it('closes on Escape', () => {
        const onClose = vi.fn();
        render(<FeedbackModal open onClose={onClose} />);
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});

describe('FeedbackButton', () => {
    it('opens the dialog on click', () => {
        render(<FeedbackButton />);
        expect(screen.queryByRole('dialog')).toBeNull();
        fireEvent.click(screen.getByTestId('feedback-button'));
        expect(screen.getByRole('dialog')).toBeDefined();
    });
});

describe('postFeedback', () => {
    const payload: FeedbackPayload = {
        message: MESSAGE, category: 'bug', path: '/', appVersion: '1.0.0', honeypot: '',
    };

    it('POSTs JSON to the feedback endpoint', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
        await postFeedback(payload);
        expect(fetchMock).toHaveBeenCalledWith(FEEDBACK_ENDPOINT, expect.objectContaining({ method: 'POST' }));
        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(JSON.parse(init.body as string)).toMatchObject({ message: MESSAGE, category: 'bug' });
    });

    it('maps 429 to a readable error', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(
            new Response('{"error":"rate_limited"}', { status: 429 }),
        );
        await expect(postFeedback(payload)).rejects.toThrow('Too many submissions');
    });
});
