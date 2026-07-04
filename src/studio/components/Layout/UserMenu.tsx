// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
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
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    // Fixed-position anchor for the dropdown. The dropdown is rendered in a
    // portal on <body> (see below) because the header toolbar is a
    // `bar-scroll-x` container (overflow-x:auto → overflow-y:hidden), which
    // would otherwise CLIP the dropdown to the 40px toolbar height — the menu
    // rendered "under the toolbar" and was unclickable. A portal + fixed
    // positioning escapes the clip and any stacking context.
    const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

    const positionDropdown = () => {
        const r = triggerRef.current?.getBoundingClientRect();
        if (r) setAnchor({ top: r.bottom + 4, right: Math.max(0, window.innerWidth - r.right) });
    };

    // Toggle open, computing the anchor up-front in the click handler (an event
    // handler — not an effect body — so we avoid the set-state-in-effect rule).
    const toggleOpen = () => {
        if (!open) positionDropdown(); // opening → anchor under the trigger first
        setOpen((o) => !o);
    };

    // Close on outside click / Escape; reposition while open on resize/scroll.
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (triggerRef.current?.contains(t) || dropdownRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const reposition = () => positionDropdown();
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('resize', reposition);
        window.addEventListener('scroll', reposition, true);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('resize', reposition);
            window.removeEventListener('scroll', reposition, true);
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

    const dropdown = open ? (
        <div
            ref={dropdownRef}
            role="menu"
            style={{
                position: 'fixed',
                top: anchor?.top ?? 0,
                right: anchor?.right ?? 0,
            }}
            className="w-56 bg-[#1a1a1a] border border-[#333] rounded shadow-lg z-[1000] py-1"
            data-testid="user-menu-dropdown"
        >
            <div className="px-3 py-1.5 text-xs text-gray-400 truncate" data-testid="user-menu-email">
                {email}
            </div>
            <div className="h-px bg-[#333] my-1" />
            <a
                href="/me"
                className="block px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#222] no-underline transition-colors"
                role="menuitem"
            >
                Your projects
            </a>
            <a
                href="/billing"
                className="block px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-[#222] no-underline transition-colors"
                role="menuitem"
            >
                Usage &amp; billing
            </a>
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
    ) : null;

    return (
        <div className="relative" data-testid="user-menu">
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                className="flex items-center gap-1 rounded-full bg-[#2b2b2b] hover:bg-[#3a3a3a] pl-0.5 pr-1.5 py-0.5 text-gray-200 hover:text-white transition-colors ring-1 ring-[#444]"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={open}
                title={email}
                data-testid="user-menu-avatar"
            >
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-semibold">
                    {initial}
                </span>
                <ChevronDown size={12} className="text-gray-400" />
            </button>
            {/* Portaled to <body> so the header toolbar's overflow clip can't hide it. */}
            {dropdown && typeof document !== 'undefined'
                ? createPortal(dropdown, document.body)
                : null}
        </div>
    );
}
