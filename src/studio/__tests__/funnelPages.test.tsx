// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import GenerateHero from '../routes/GenerateHero';
import { ConnectCheck } from '../connect/ConnectCheck';
import { ClientPanel, ClientPicker } from '../connect/ConnectClientPanel';
import { connectClient } from '../connect/connectClients';
import { useFirstModelWatch } from '../connect/useFirstModelWatch';
import { WATCH_INTERVAL_MS } from '../connect/firstModelWatch';
import { CopyField } from '../../funnel/components/CopyField';
import { PricingTiers } from '../../funnel/components/PricingTiers';
import { TIERS } from '../../funnel/lib/pricingTiers';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

type HeroProps = Parameters<typeof GenerateHero>[0];

function hero(over: Partial<HeroProps> = {}) {
  const props: HeroProps = {
    agentEnabled: true,
    isBusy: false,
    initialPrompt: '',
    onSubmit: vi.fn(),
    hasSession: false,
    sessionEmail: null,
    sessionLoading: false,
    phase: { state: 'idle' },
    events: [],
    upgradeBusy: false,
    onUpgrade: vi.fn(),
    onSignIn: vi.fn(),
    onOpenResult: vi.fn(),
    onRetry: vi.fn(),
    ...over,
  };
  render(<GenerateHero {...props} />);
  return props;
}

describe('/generate hero', () => {
  it('puts a Sign in button next to Create for signed-out visitors', () => {
    const props = hero();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(props.onSignIn).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /Create/ })).toBeTruthy();
  });

  it('shows no Sign in button once signed in', () => {
    hero({ hasSession: true, sessionEmail: 'a@b.c' });
    expect(screen.queryByRole('button', { name: 'Sign in' })).toBeNull();
    expect(screen.getByText('Signed in as a@b.c.')).toBeTruthy();
  });

  it('shows the step list with what the agent is doing while a run is in progress', () => {
    hero({
      hasSession: true,
      isBusy: true,
      phase: { state: 'running', lastEvent: { kind: 'status', phase: 'running' } },
      events: [
        { kind: 'progress', stage: 'writing_code', message: 'Writing the script', elapsedMs: 5000 },
      ],
    });
    expect(screen.getByRole('heading', { name: 'Building your model' })).toBeTruthy();
    expect(screen.getByText('Writing the script')).toBeTruthy();
    expect(screen.getByText(/Plan the part/).textContent).toMatch(/done/);
  });

  it('holds a partial result on the page and says what was not checked', () => {
    const props = hero({
      hasSession: true,
      phase: {
        state: 'done',
        generationId: 'g1',
        anonId: 'a1',
        artifact: { title: 't', code: 'c', parameters: [], suggestions: [] },
        partial: { reason: 'timeout', stage: 'verifying', unverified: ['interference'], note: 'Time limit reached.' },
      },
    });
    expect(screen.getByRole('alert').textContent).toMatch(/not fully checked.*interference check/s);
    fireEvent.click(screen.getByRole('button', { name: 'Open the model' }));
    expect(props.onOpenResult).toHaveBeenCalledTimes(1);
  });

  it('turns a failed run into an error with a retry and a way to use your own agent', () => {
    const props = hero({
      hasSession: true,
      phase: { state: 'error', code: 'gate_failed', message: 'Two bodies overlap.', generationId: 'g1' },
    });
    expect(screen.getByText('The model did not build')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Use your own agent' }).getAttribute('href')).toBe('/connect');
  });

  it('points to /connect when the built-in agent is off', () => {
    hero({ agentEnabled: false });
    expect(screen.getByRole('link', { name: 'Connect your agent' }).getAttribute('href')).toBe('/connect');
    expect((screen.getByRole('button', { name: /Create/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('/connect agent picker', () => {
  it('switches agents with the arrow keys', () => {
    const onChange = vi.fn();
    render(<ClientPicker value="chatgpt" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: /ChatGPT/ }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('claude');
    fireEvent.keyDown(screen.getByRole('tab', { name: /ChatGPT/ }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('vscode');
  });

  it('shows the Codex commands to copy', () => {
    render(<ClientPanel client={connectClient('codex')} />);
    expect(screen.getByText('codex mcp add kernelcad --url https://mcp.kernelcad.com/mcp')).toBeTruthy();
    expect(screen.getByText('codex mcp login kernelcad')).toBeTruthy();
  });

  it('shows the MCP URL and the settings link for ChatGPT', () => {
    render(<ClientPanel client={connectClient('chatgpt')} />);
    expect(screen.getByText('https://mcp.kernelcad.com/mcp')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Open ChatGPT settings/ })).toBeTruthy();
  });
});

describe('/connect "check it worked"', () => {
  it('asks signed-out visitors to sign in and come back to /connect', () => {
    render(<ConnectCheck state={{ kind: 'signed_out' }} since={0} onRestart={vi.fn()} signInHref="/signin?next=%2Fconnect" />);
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/signin?next=%2Fconnect');
  });

  it('links to the first saved model', () => {
    render(
      <ConnectCheck
        state={{ kind: 'found', project: { slug: 'wall-bracket', title: 'Wall bracket', updated_at: '' } }}
        since={0}
        onRestart={vi.fn()}
        signInHref="/signin"
      />,
    );
    expect(screen.getByText('It works: your agent saved a model')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open the model' }).getAttribute('href')).toBe('/p/wall-bracket');
  });

  it('offers to watch again after the time limit', () => {
    const onRestart = vi.fn();
    render(<ConnectCheck state={{ kind: 'timeout' }} since={0} onRestart={onRestart} signInHref="/signin" />);
    fireEvent.click(screen.getByRole('button', { name: 'Watch again' }));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('polls the projects until a model saved after the watch started appears', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const saved = { slug: 'new-one', title: 'New one', updated_at: new Date(Date.now() + 60_000).toISOString() };
    const old = { slug: 'old', title: 'Old', updated_at: '2020-01-01T00:00:00Z' };
    const list = vi.fn().mockResolvedValueOnce([old]).mockResolvedValue([saved, old]);
    const { result } = renderHook(() => useFirstModelWatch(true, list));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(result.current.state.kind).toBe('watching');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(WATCH_INTERVAL_MS);
    });
    await waitFor(() => expect(result.current.state).toEqual({ kind: 'found', project: saved }));
  });

  it('does not poll while signed out', () => {
    const list = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() => useFirstModelWatch(false, list));
    expect(result.current.state.kind).toBe('signed_out');
    expect(list).not.toHaveBeenCalled();
  });
});

describe('CopyField', () => {
  it('copies the value and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onCopied = vi.fn();
    render(<CopyField value="https://mcp.kernelcad.com/mcp" copyLabel="Copy the MCP URL" onCopied={onCopied} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy the MCP URL' }));
    await waitFor(() => expect(screen.getByText('Copied')).toBeTruthy());
    expect(writeText).toHaveBeenCalledWith('https://mcp.kernelcad.com/mcp');
    expect(onCopied).toHaveBeenCalledTimes(1);
  });

  it('tells the user to copy by hand when the clipboard is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
    render(<CopyField value="x" copyLabel="Copy x" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy x' }));
    await waitFor(() => expect(screen.getByText('Copy by hand')).toBeTruthy());
  });
});

describe('pricing list style', () => {
  it('renders every feature as plain text, without the emoji from the data', () => {
    const { container } = render(<PricingTiers period="monthly" onSelect={vi.fn()} onFree={vi.fn()} />);
    const emojis = TIERS.flatMap((t) => t.features.map((f) => f.emoji)).filter((e): e is string => !!e);
    expect(emojis.length).toBeGreaterThan(0);
    for (const e of emojis) expect(container.textContent).not.toContain(e);
    expect(container.textContent).not.toContain('←');
    expect(screen.getByText('Everything in Basic, plus:')).toBeTruthy();
  });
});
