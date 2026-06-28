// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../../../funnel/hooks/useSession';
import { getSupabase, isAuthConfigured } from '../../../funnel/lib/supabaseClient';
import { SignInButton } from '../../../funnel/components/SignInButton';

/**
 * Header auth control for the Studio editor.
 *
 * Outer layer: opts out cleanly when Supabase auth is not configured (plain
 * local dev), so `useSession()` is only ever called when a Supabase client can
 * be created. This keeps React hook rules clean — `UserMenuInner` always calls
 * its hooks unconditionally.
 */
export default function UserMenu() {
    if (!isAuthConfigured()) return null;
    return <UserMenuInner />;
}

function UserMenuInner() {
    const { session, loading } = useSession();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close the dropdown on outside click / Escape.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    // Avoid a sign-in → avatar flash on first paint.
    if (loading) return null;

    if (session === null) {
        return (
            <span title="Sign in to use the agent and save projects">
                <SignInButton className="inline-flex items-center gap-2 rounded bg-[#222] hover:bg-[#333] text-gray-300 hover:text-white px-2 py-1 text-xs font-medium transition-colors">
                    Sign in
                </SignInButton>
            </span>
        );
    }

    const email = session.user.email ?? '';
    const initial = (email.charAt(0) || '?').toUpperCase();

    const handleSignOut = async () => {
        try {
            await getSupabase().auth.signOut();
            // onAuthStateChange in useSession is the source of truth; the menu
            // updates reactively once the session clears.
        } catch (err) {
            alert('Sign-out failed: ' + (err instanceof Error ? err.message : String(err)));
        }
        setOpen(false);
    };

    return (
        <div className="relative" ref={menuRef} data-testid="user-menu">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#222] hover:bg-[#333] text-gray-300 hover:text-white text-xs font-medium transition-colors"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={open}
                title={email}
                data-testid="user-menu-avatar"
            >
                {initial}
            </button>
            {open && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1a] border border-[#333] rounded shadow-lg z-50 py-1"
                    data-testid="user-menu-dropdown"
                >
                    <div className="px-3 py-1.5 text-xs text-gray-400 truncate" data-testid="user-menu-email">
                        {email}
                    </div>
                    <div className="h-px bg-[#333] my-1" />
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#222] transition-colors"
                        role="menuitem"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
