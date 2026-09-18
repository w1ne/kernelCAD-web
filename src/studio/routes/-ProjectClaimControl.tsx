// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Globe, Lock } from 'lucide-react';
import { SignInButton } from '../../funnel/components/SignInButton';
import type { ProjectRow } from '../../funnel/lib/apiClient';

const BTN_CLASS = 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors';

export interface ProjectClaimControlProps {
  project: ProjectRow;
  session: Session | null;
  claimed: boolean;
  claiming: boolean;
  privacyBusy: boolean;
  upgradeNeeded: boolean;
  onClaim: () => void;
  onTogglePrivacy: () => void;
  onUpgrade: () => void;
}

/** Claim/save, owner privacy toggle, and upgrade CTA rendered in the /p/:slug
 *  header's right slot. */
export function ProjectClaimControl({
  project,
  session,
  claimed,
  claiming,
  privacyBusy,
  upgradeNeeded,
  onClaim,
  onTogglePrivacy,
  onUpgrade,
}: ProjectClaimControlProps): ReactNode {
  // Anonymous (owner-less) projects — e.g. built by a web-Claude session via
  // open_in_studio — can be claimed: "sign in to save" → claim into your account.
  const isAnonymous = project.owner_id == null && !claimed;
  const isOwner = !!session && project.owner_id != null && project.owner_id === session.user.id;
  const isPrivate = project.privacy === 'private';

  let claimControl: ReactNode = null;
  if (claimed) {
    claimControl = <span className="text-[11px] text-green-500 font-mono">Saved ✓</span>;
  } else if (isAnonymous && !session) {
    claimControl = (
      <SignInButton
        redirectTo={typeof window !== 'undefined' ? window.location.href : undefined}
        className={BTN_CLASS}
      >
        Sign in to save
      </SignInButton>
    );
  } else if (isAnonymous && session) {
    claimControl = (
      <button type="button" onClick={onClaim} disabled={claiming} className={BTN_CLASS}>
        {claiming ? 'Saving…' : 'Save to my projects'}
      </button>
    );
  } else if (isOwner) {
    claimControl = upgradeNeeded ? (
      <button type="button" onClick={onUpgrade} className={BTN_CLASS} title="Private projects require Pro">
        Upgrade to keep private
      </button>
    ) : (
      // Icon-only below `md`: spelled out, this button plus Share crowds the
      // project title off a phone-width header entirely.
      <button
        type="button"
        onClick={onTogglePrivacy}
        disabled={privacyBusy}
        className={BTN_CLASS}
        aria-label={isPrivate ? 'Make public' : 'Make private'}
        title={isPrivate ? 'Make public' : 'Make private'}
      >
        {isPrivate ? <Globe size={12} /> : <Lock size={12} />}
        <span className="hidden md:inline">
          {privacyBusy ? '…' : isPrivate ? 'Make public' : 'Make private'}
        </span>
      </button>
    );
  }

  return <>{claimControl}</>;
}
