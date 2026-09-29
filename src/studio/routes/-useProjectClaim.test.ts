// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import type { ProjectRow } from '../../funnel/lib/apiClient';

const { navigateMock, claimProjectMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  claimProjectMock: vi.fn(),
}));
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }));
vi.mock('../../funnel/lib/apiClient', () => ({ claimProject: claimProjectMock }));

import { useProjectClaim } from './-useProjectClaim';

const session = { user: { id: 'user-1' } } as Session;
const anonProject = { slug: 'abc', owner_id: null } as ProjectRow;

beforeEach(() => {
  claimProjectMock.mockResolvedValue({ claimed: true });
  window.history.replaceState(null, '', '/p/abc');
});
afterEach(() => vi.clearAllMocks());

describe('useProjectClaim', () => {
  it('claims once on return from sign-in with ?claim=1, drops the flag, and lands on /me', async () => {
    window.history.replaceState(null, '', '/p/abc?width=20&claim=1');
    const { rerender } = renderHook(() => useProjectClaim('abc', session, anonProject));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith({ to: '/me', search: { moved: 1 } }));
    rerender();
    expect(claimProjectMock).toHaveBeenCalledTimes(1);
    expect(claimProjectMock).toHaveBeenCalledWith('abc');
    expect(window.location.search).toBe('?width=20');
  });

  it('does not auto-claim without the flag, while signed out, or on an owned project', async () => {
    renderHook(() => useProjectClaim('abc', session, anonProject));
    window.history.replaceState(null, '', '/p/abc?claim=1');
    renderHook(() => useProjectClaim('abc', null, anonProject));
    renderHook(() => useProjectClaim('abc', session, { ...anonProject, owner_id: 'other' }));
    await Promise.resolve();
    expect(claimProjectMock).not.toHaveBeenCalled();
  });

  it('header claim stays on the page; a refused claim does not navigate', async () => {
    const { result } = renderHook(() => useProjectClaim('abc', session, anonProject));
    await act(async () => { result.current.onClaim(); });
    expect(result.current.claimed).toBe(true);
    expect(navigateMock).not.toHaveBeenCalled();

    claimProjectMock.mockResolvedValueOnce({ claimed: false });
    await act(async () => { result.current.onBannerClaim(); });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
