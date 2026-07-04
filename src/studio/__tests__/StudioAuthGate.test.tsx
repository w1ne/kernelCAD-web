// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { StudioAuthGate } from '../StudioAuthGate';

const mockSession = vi.fn();
vi.mock('../../funnel/hooks/useSession', () => ({
  useOptionalSession: () => mockSession(),
}));

const mockIsAuthConfigured = vi.fn(() => true);
vi.mock('../../funnel/lib/supabaseClient', () => ({
  isAuthConfigured: () => mockIsAuthConfigured(),
}));

afterEach(() => cleanup());

describe('StudioAuthGate', () => {
  it('shows splash while loading', () => {
    mockIsAuthConfigured.mockReturnValue(true);
    mockSession.mockReturnValue({ session: null, loading: true });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.queryByText('EDITOR')).toBeNull();
    expect(screen.getByTestId('studio-auth-splash')).toBeInTheDocument();
  });

  it('shows non-dismissable sign-in window when anonymous', () => {
    mockIsAuthConfigured.mockReturnValue(true);
    mockSession.mockReturnValue({ session: null, loading: false });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.queryByText('EDITOR')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByLabelText('Close')).toBeNull();
    expect(screen.queryByText(/5 free generations/)).toBeNull();
  });

  it('renders children when signed in', () => {
    mockIsAuthConfigured.mockReturnValue(true);
    mockSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.getByText('EDITOR')).toBeInTheDocument();
  });

  it('renders children when auth is not configured', () => {
    mockIsAuthConfigured.mockReturnValue(false);
    mockSession.mockReturnValue({ session: null, loading: false });
    render(<StudioAuthGate><div>EDITOR</div></StudioAuthGate>);
    expect(screen.getByText('EDITOR')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
