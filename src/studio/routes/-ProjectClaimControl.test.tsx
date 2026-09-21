// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import { ProjectClaimControl } from './-ProjectClaimControl';

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: 'p-1',
    slug: 'demo',
    title: 'Demo',
    privacy: 'public_unlisted',
    current_code: '',
    parameters: {},
    version: 1,
    updated_at: '2026-06-13T00:00:00Z',
    owner_id: null,
    ...overrides,
  } as ProjectRow;
}

function makeSession(id: string): Session {
  return { user: { id } } as Session;
}

type ControlProps = Parameters<typeof ProjectClaimControl>[0];

function renderControl(overrides: Partial<ControlProps> = {}) {
  const props: ControlProps = {
    project: makeProject(),
    session: null,
    claimed: false,
    claiming: false,
    privacyBusy: false,
    upgradeNeeded: false,
    onClaim: vi.fn(),
    onTogglePrivacy: vi.fn(),
    onUpgrade: vi.fn(),
    ...overrides,
  };
  return { ...render(<ProjectClaimControl {...props} />), props };
}

afterEach(cleanup);

describe('ProjectClaimControl', () => {
  it('shows the Saved badge once claimed, hiding every action', () => {
    const { container } = renderControl({ claimed: true });
    expect(screen.getByText('Saved ✓')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('prefers the Saved badge over the anonymous sign-in prompt', () => {
    renderControl({ claimed: true, project: makeProject({ owner_id: null }), session: null });
    expect(screen.getByText('Saved ✓')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sign in to save' })).toBeNull();
  });

  it('prompts an anonymous signed-out visitor to sign in to save', () => {
    renderControl({ project: makeProject({ owner_id: null }), session: null });
    expect(screen.getByRole('button', { name: 'Sign in to save' })).toBeDefined();
  });

  it('offers Save to my projects to a signed-in visitor on an anonymous project', () => {
    const { props } = renderControl({
      project: makeProject({ owner_id: null }),
      session: makeSession('viewer-1'),
    });
    const save = screen.getByRole('button', { name: 'Save to my projects' }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(props.onClaim).toHaveBeenCalledTimes(1);
    expect(props.onTogglePrivacy).not.toHaveBeenCalled();
    expect(props.onUpgrade).not.toHaveBeenCalled();
  });

  it('disables the claim control and shows Saving… while a claim is in flight', () => {
    renderControl({
      project: makeProject({ owner_id: null }),
      session: makeSession('viewer-1'),
      claiming: true,
    });
    const save = screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('renders nothing for a signed-in non-owner on an owned project', () => {
    const { container } = renderControl({
      project: makeProject({ owner_id: 'someone-else' }),
      session: makeSession('viewer-1'),
    });
    expect(screen.queryByRole('button')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('renders nothing for a signed-out visitor on an owned project', () => {
    const { container } = renderControl({
      project: makeProject({ owner_id: 'someone-else' }),
      session: null,
    });
    expect(container.textContent).toBe('');
  });

  it('shows Upgrade to keep private for an owner who needs Pro', () => {
    const { props } = renderControl({
      project: makeProject({ owner_id: 'owner-1' }),
      session: makeSession('owner-1'),
      upgradeNeeded: true,
    });
    const upgrade = screen.getByRole('button', { name: 'Upgrade to keep private' });
    expect(upgrade.getAttribute('title')).toBe('Private projects require Pro');
    fireEvent.click(upgrade);
    expect(props.onUpgrade).toHaveBeenCalledTimes(1);
    expect(props.onTogglePrivacy).not.toHaveBeenCalled();
  });

  it('offers Make public on a private project owned by the viewer', () => {
    const { props } = renderControl({
      project: makeProject({ owner_id: 'owner-1', privacy: 'private' }),
      session: makeSession('owner-1'),
    });
    const toggle = screen.getByRole('button', { name: 'Make public' });
    expect(toggle.getAttribute('title')).toBe('Make public');
    expect(screen.getByText('Make public')).toBeDefined();
    fireEvent.click(toggle);
    expect(props.onTogglePrivacy).toHaveBeenCalledTimes(1);
    expect(props.onUpgrade).not.toHaveBeenCalled();
  });

  it('offers Make private on a public project owned by the viewer', () => {
    renderControl({
      project: makeProject({ owner_id: 'owner-1', privacy: 'public_unlisted' }),
      session: makeSession('owner-1'),
    });
    const toggle = screen.getByRole('button', { name: 'Make private' });
    expect(toggle.getAttribute('title')).toBe('Make private');
    expect(screen.getByText('Make private')).toBeDefined();
  });

  it('disables the privacy toggle and shows … while privacy is busy', () => {
    renderControl({
      project: makeProject({ owner_id: 'owner-1', privacy: 'private' }),
      session: makeSession('owner-1'),
      privacyBusy: true,
    });
    const toggle = screen.getByRole('button', { name: 'Make public' }) as HTMLButtonElement;
    expect(toggle.disabled).toBe(true);
    expect(screen.getByText('…')).toBeDefined();
    expect(screen.queryByText('Make public')).toBeNull();
  });
});
