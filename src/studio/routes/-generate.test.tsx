// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { GenerationPhase } from '../../funnel/hooks/useGeneration';

const submit = vi.fn();
let phase: GenerationPhase = { state: 'idle' };
let session: { user: { email: string } } | null = null;
let sessionLoading = false;
const navigate = vi.fn();
const getTurnstileToken = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => navigate,
}));
vi.mock('../../funnel/hooks/useGeneration', () => ({
  useGeneration: () => ({ phase, events: [], submit }),
}));
vi.mock('../../funnel/hooks/useSession', () => ({
  useOptionalSession: () => ({ session, loading: sessionLoading }),
  useSession: () => { throw new Error('bare useSession must not be used here'); },
}));
vi.mock('../../funnel/lib/turnstile', () => ({ getTurnstileToken: (...a: unknown[]) => getTurnstileToken(...a) }));
vi.mock('../agentAvailability', () => ({ inAppAgentEnabled: () => true }));
vi.mock('../../funnel/components/FunnelHeader', () => ({ FunnelHeader: () => null }));
vi.mock('../../funnel/components/GallerySection', () => ({ GallerySection: () => null }));
vi.mock('../../funnel/components/EmailSignup', () => ({ EmailSignup: () => null }));
vi.mock('../../funnel/lib/apiClient', () => ({ createCheckoutSession: vi.fn() }));
vi.mock('../../funnel/components/SignInModal', () => ({
  SignInModal: ({ open }: { open: boolean }) => (open ? <div role="dialog">sign in</div> : null),
}));

import { GeneratePage } from './generate';

function visit(search: string, referrer: string) {
  window.history.replaceState({}, '', `/generate${search}`);
  Object.defineProperty(document, 'referrer', { value: referrer, configurable: true });
}

beforeEach(() => {
  submit.mockReset();
  navigate.mockReset();
  getTurnstileToken.mockReset().mockResolvedValue(undefined);
  phase = { state: 'idle' };
  session = null;
  sessionLoading = false;
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const box = () => screen.getByLabelText('Describe the part') as HTMLTextAreaElement;

describe('/generate handoff from the landing page', () => {
  it('prefills the prompt from q and strips q and auto from the URL', () => {
    visit('?q=%20a%20bracket%20&auto=1&keep=1', '');
    render(<GeneratePage />);
    expect(box().value).toBe('a bracket');
    expect(window.location.search).toBe('?keep=1');
  });

  it('submits once, signed out, when auto=1 comes from kernelcad.com', async () => {
    visit('?q=a+bracket&auto=1', 'https://kernelcad.com/');
    const { rerender } = render(<GeneratePage />);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith('a bracket', undefined, undefined, undefined, undefined);
    rerender(<GeneratePage />);
    await act(async () => {});
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it.each([['', 'empty'], ['https://app.kernelcad.com/', 'app'], ['https://evil.example/', 'foreign']])(
    'only prefills when the referrer is %j (%s)',
    async (referrer) => {
      visit('?q=a+bracket&auto=1', referrer);
      render(<GeneratePage />);
      await act(async () => {});
      expect(box().value).toBe('a bracket');
      expect(submit).not.toHaveBeenCalled();
    },
  );

  it('waits for the session to load so a signed-in visitor is not sent as anonymous', async () => {
    visit('?q=a+bracket&auto=1', 'https://www.kernelcad.com/');
    sessionLoading = true;
    const { rerender } = render(<GeneratePage />);
    await act(async () => {});
    expect(submit).not.toHaveBeenCalled();
    sessionLoading = false;
    session = { user: { email: 'a@b.c' } };
    rerender(<GeneratePage />);
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith('a bracket');
  });
});

describe('/generate submit', () => {
  it('signed out: no sign-in modal first, the request goes out', async () => {
    visit('', '');
    render(<GeneratePage />);
    fireEvent.change(box(), { target: { value: 'a hex bolt' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem('kc:pendingPrompt')).toBeNull();
  });

  it('signed out with a site key: sends the Turnstile token', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key');
    getTurnstileToken.mockResolvedValue('tok');
    visit('', '');
    render(<GeneratePage />);
    fireEvent.change(box(), { target: { value: 'a hex bolt' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith('a hex bolt', undefined, undefined, undefined, 'tok'));
    expect(getTurnstileToken).toHaveBeenCalledWith('site-key');
  });

  it('signed out, token fails: still sends, without a token', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key');
    getTurnstileToken.mockRejectedValue(new Error('blocked'));
    visit('', '');
    render(<GeneratePage />);
    fireEvent.change(box(), { target: { value: 'a hex bolt' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith('a hex bolt', undefined, undefined, undefined, undefined));
  });

  it('signed in: no Turnstile, submit unchanged', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site-key');
    session = { user: { email: 'a@b.c' } };
    visit('', '');
    render(<GeneratePage />);
    fireEvent.change(box(), { target: { value: 'a hex bolt' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith('a hex bolt');
    expect(getTurnstileToken).not.toHaveBeenCalled();
  });

  it('anon_limit: stashes the prompt and opens the sign-in dialog', async () => {
    visit('', '');
    const { rerender } = render(<GeneratePage />);
    fireEvent.change(box(), { target: { value: 'a hex bolt' } });
    fireEvent.click(screen.getByRole('button', { name: /Create/ }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    phase = { state: 'error', code: 'anon_limit', message: 'Sign in to build.', anonReason: 'rate' };
    rerender(<GeneratePage />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(window.localStorage.getItem('kc:pendingPrompt')).toBe('a hex bolt');
  });

  it('a plain rate_limited error does not open the dialog by itself', async () => {
    visit('', '');
    phase = { state: 'error', code: 'rate_limited', message: 'x' };
    render(<GeneratePage />);
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
