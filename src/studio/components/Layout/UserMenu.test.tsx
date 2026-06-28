// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { Session } from '@supabase/supabase-js';
import UserMenu from './UserMenu';
import { useSession } from '../../../funnel/hooks/useSession';
import { isAuthConfigured, getSupabase } from '../../../funnel/lib/supabaseClient';

vi.mock('../../../funnel/hooks/useSession', () => ({
    useSession: vi.fn(),
}));

const signOut = vi.fn().mockResolvedValue({ error: null });

vi.mock('../../../funnel/lib/supabaseClient', () => ({
    isAuthConfigured: vi.fn(),
    getSupabase: vi.fn(() => ({
        auth: {
            signOut,
            signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
        },
    })),
}));

const mockUseSession = vi.mocked(useSession);
const mockIsAuthConfigured = vi.mocked(isAuthConfigured);

function fakeSession(email: string): Session {
    return { user: { email } } as unknown as Session;
}

beforeEach(() => {
    mockIsAuthConfigured.mockReturnValue(true);
    signOut.mockClear();
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('UserMenu', () => {
    it('renders nothing when auth is not configured', () => {
        mockIsAuthConfigured.mockReturnValue(false);
        mockUseSession.mockReturnValue({ session: null, loading: false });
        const { container } = render(<UserMenu />);
        expect(container.firstChild).toBeNull();
    });

    it('renders nothing while the session is loading', () => {
        mockUseSession.mockReturnValue({ session: null, loading: true });
        const { container } = render(<UserMenu />);
        expect(container.firstChild).toBeNull();
    });

    it('shows a Sign in control when signed out', () => {
        mockUseSession.mockReturnValue({ session: null, loading: false });
        render(<UserMenu />);
        expect(screen.getByText('Sign in')).toBeDefined();
    });

    it('shows the account email and signs out when signed in', async () => {
        mockUseSession.mockReturnValue({ session: fakeSession('jane@example.com'), loading: false });
        render(<UserMenu />);

        // Avatar shows the uppercased first letter.
        const avatar = screen.getByTestId('user-menu-avatar');
        expect(avatar.textContent).toBe('J');

        // Open the dropdown and confirm the email is shown.
        fireEvent.click(avatar);
        expect(screen.getByText('jane@example.com')).toBeDefined();

        // Sign out calls the mocked supabase client.
        fireEvent.click(screen.getByText('Sign out'));
        expect(getSupabase).toHaveBeenCalled();
        expect(signOut).toHaveBeenCalled();
    });

    it('closes the dropdown on Escape', () => {
        mockUseSession.mockReturnValue({ session: fakeSession('jane@example.com'), loading: false });
        render(<UserMenu />);

        fireEvent.click(screen.getByTestId('user-menu-avatar'));
        expect(screen.queryByTestId('user-menu-dropdown')).not.toBeNull();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByTestId('user-menu-dropdown')).toBeNull();
    });
});
