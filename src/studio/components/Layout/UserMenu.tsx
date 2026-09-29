// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { useSession } from '../../../funnel/hooks/useSession';
import { getSupabase, isAuthConfigured } from '../../../funnel/lib/supabaseClient';
import { buttonClass } from '../../../ui/buttonStyles';
import { FeedbackButton } from './FeedbackButton';
import { openFeedback } from './feedbackRequests';

/**
 * Header auth control for the Studio editor.
 *
 * Outer layer: opts out cleanly when Supabase auth is not configured (plain
 * local dev), so `useSession()` is only ever called when a Supabase client can
 * be created. This keeps React hook rules clean — `UserMenuInner` always calls
 * its hooks unconditionally.
 */
export default function UserMenu() {
    // No accounts here (plain local dev): feedback is the only account-slot action.
    if (!isAuthConfigured()) return <FeedbackButton />;
    return <UserMenuInner />;
}

/** The sign-in page, returning to this page afterwards. */
function signInHref(): string {
    const here = typeof window === 'undefined' ? '/' : `${window.location.pathname}${window.location.search}`;
    return `/signin?next=${encodeURIComponent(here)}`;
}

/** Signed out there is no account menu, so Feedback stays an icon next to
 *  one neutral Sign in link (the provider buttons live on the sign-in page). */
function SignInControl() {
    return (
        <>
            <FeedbackButton />
            <a
                href={signInHref()}
                title="Sign in to use the agent and save projects"
                data-testid="header-sign-in"
                className={`${buttonClass('secondary', 'sm')} no-underline`}
            >
                Sign in
            </a>
        </>
    );
}

const ITEM_CLASS =
    'block w-full text-left rounded-control px-2.5 py-1.5 text-ui text-fg-2 no-underline transition-colors duration-80 hover:bg-surface-2 hover:text-fg focus-ring';

function AccountDropdown({
    dropdownRef,
    anchor,
    email,
    onFeedback,
    onSignOut,
}: {
    dropdownRef: React.RefObject<HTMLDivElement | null>;
    anchor: { top: number; right: number } | null;
    email: string;
    onFeedback: () => void;
    onSignOut: () => void;
}) {
    return (
        <div
            ref={dropdownRef}
            role="menu"
            data-theme="dark"
            style={{
                position: 'fixed',
                top: anchor?.top ?? 0,
                right: anchor?.right ?? 0,
            }}
            className="w-60 animate-pop-in rounded-panel border border-border bg-surface-1 p-1 shadow-e2 z-[1000]"
            data-testid="user-menu-dropdown"
        >
            <div className="px-2.5 py-1.5 text-2xs text-fg-3 truncate" data-testid="user-menu-email">
                {email}
            </div>
            <div className="h-px bg-border my-1" />
            <a href="/me" className={ITEM_CLASS} role="menuitem">
                Your projects
            </a>
            <a href="/billing" className={ITEM_CLASS} role="menuitem">
                Usage &amp; billing
            </a>
            <button type="button" onClick={onFeedback} className={ITEM_CLASS} role="menuitem" data-testid="user-menu-feedback">
                Send feedback
            </button>
            <div className="h-px bg-border my-1" />
            <button type="button" onClick={onSignOut} className={ITEM_CLASS} role="menuitem">
                Sign out
            </button>
        </div>
    );
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
        return <SignInControl />;
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
        <AccountDropdown
            dropdownRef={dropdownRef}
            anchor={anchor}
            email={email}
            onFeedback={() => {
                setOpen(false);
                openFeedback();
            }}
            onSignOut={handleSignOut}
        />
    ) : null;

    return (
        <div className="relative" data-testid="user-menu">
            <button
                ref={triggerRef}
                type="button"
                onClick={toggleOpen}
                className="focus-ring flex h-control-sm items-center gap-1 rounded-full pl-0.5 pr-1.5 text-fg-2 transition-colors duration-80 hover:bg-surface-2 hover:text-fg"
                aria-label="Account menu"
                aria-haspopup="menu"
                aria-expanded={open}
                title={email}
                data-testid="user-menu-avatar"
            >
                <span className="flex size-6 items-center justify-center rounded-full bg-accent text-on-accent text-2xs font-semibold">
                    {initial}
                </span>
                <ChevronDown size={12} aria-hidden="true" />
            </button>
            {/* Portaled to <body> so the header toolbar's overflow clip can't hide it. */}
            {dropdown && typeof document !== 'undefined'
                ? createPortal(dropdown, document.body)
                : null}
        </div>
    );
}
