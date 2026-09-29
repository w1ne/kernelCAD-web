// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CheckCircle2, Globe, Lock } from 'lucide-react';
import { SignInButton } from '../../funnel/components/SignInButton';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import { Badge, Button, buttonClass, cx } from '../../ui';
import { claimReturnUrl } from './-anonClaim';
import { signInHref, type ProjectOwnership } from './-projectPageModel';

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

function SavedBadge(): ReactNode {
  return <span className="text-[11px] text-green-500 font-mono">Saved ✓</span>;
}

function SignInToSaveButton(): ReactNode {
  return (
    <SignInButton
      redirectTo={typeof window !== 'undefined' ? claimReturnUrl(window.location.href) : undefined}
      className={BTN_CLASS}
    >
      Sign in to save
    </SignInButton>
  );
}

function SaveToProjectsButton({ claiming, onClaim }: {
  claiming: boolean;
  onClaim: () => void;
}): ReactNode {
  return (
    <button type="button" onClick={onClaim} disabled={claiming} className={BTN_CLASS}>
      {claiming ? 'Saving…' : 'Save to my projects'}
    </button>
  );
}

function UpgradeButton({ onUpgrade }: { onUpgrade: () => void }): ReactNode {
  return (
    <button type="button" onClick={onUpgrade} className={BTN_CLASS} title="Private projects require Pro">
      Upgrade to keep private
    </button>
  );
}

function PrivacyToggleButton({ isPrivate, privacyBusy, onTogglePrivacy }: {
  isPrivate: boolean;
  privacyBusy: boolean;
  onTogglePrivacy: () => void;
}): ReactNode {
  // Icon-only below `md`: spelled out, this button plus Share crowds the
  // project title off a phone-width header entirely.
  return (
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
    claimControl = <SavedBadge />;
  } else if (isAnonymous && !session) {
    claimControl = <SignInToSaveButton />;
  } else if (isAnonymous && session) {
    claimControl = <SaveToProjectsButton claiming={claiming} onClaim={onClaim} />;
  } else if (isOwner) {
    claimControl = upgradeNeeded ? (
      <UpgradeButton onUpgrade={onUpgrade} />
    ) : (
      <PrivacyToggleButton
        isPrivate={isPrivate}
        privacyBusy={privacyBusy}
        onTogglePrivacy={onTogglePrivacy}
      />
    );
  }

  return <>{claimControl}</>;
}

export interface AnonProjectBannerProps {
  project: ProjectRow;
  session: Session | null;
  claimed: boolean;
  claiming: boolean;
  onClaim: () => void;
  /** `studio`: fixed over the dark workbench (default). `page`: a notice at
   *  the top of the /p/<slug> model stage, in the semantic tokens. */
  look?: 'studio' | 'page';
}

const BANNER_CLASS = {
  studio: 'fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-lg border border-amber-600/60 bg-[#1f1a10]/95 px-4 py-2.5 text-sm text-amber-100 shadow-lg',
  page: 'absolute left-3 right-3 top-3 z-10 mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-panel border border-border bg-surface-1/95 px-4 py-2 text-ui text-fg shadow-e2 backdrop-blur-sm',
} as const;

const BANNER_BUTTON = {
  studio: BTN_CLASS,
  page: buttonClass('secondary', 'sm'),
} as const;

/** Banner on /p/:slug for a project that no account owns yet (made by an
 *  anonymous agent session). Signed out: sign in, come back, claim runs.
 *  Signed in: claim now. */
export function AnonProjectBanner({
  project,
  session,
  claimed,
  claiming,
  onClaim,
  look = 'studio',
}: AnonProjectBannerProps): ReactNode {
  if (project.owner_id != null || claimed) return null;
  const action = session ? (
    <button type="button" onClick={onClaim} disabled={claiming} className={BANNER_BUTTON[look]}>
      {claiming ? 'Saving…' : 'Save it to my account'}
    </button>
  ) : (
    <SignInButton
      redirectTo={typeof window !== 'undefined' ? claimReturnUrl(window.location.href) : undefined}
      className={BANNER_BUTTON[look]}
    >
      Sign in to keep it
    </SignInButton>
  );
  return (
    <div role="status" className={BANNER_CLASS[look]} data-testid="anon-project-banner">
      <span>This project isn&apos;t saved to an account yet —</span>
      {action}
    </div>
  );
}

export interface KeepThisModelProps {
  slug: string;
  project: ProjectRow;
  session: Session | null;
  ownership: ProjectOwnership;
  claiming: boolean;
  privacyBusy: boolean;
  upgradeNeeded: boolean;
  onClaim: () => void;
  onTogglePrivacy: () => void;
  onUpgrade: () => void;
}

const SECTION_TITLE = 'text-ui font-semibold text-fg';
const SECTION_TEXT = 'text-ui text-fg-2';
const TOUCH = 'max-md:h-touch';

function SavedLine(): ReactNode {
  return (
    <p className="flex items-center gap-2 text-ui font-medium text-ok" data-testid="keep-saved">
      <CheckCircle2 className="size-4" strokeWidth={1.75} aria-hidden="true" />
      Saved to your projects
    </p>
  );
}

function PrivacyRow({ isPrivate, privacyBusy, upgradeNeeded, onTogglePrivacy, onUpgrade }: {
  isPrivate: boolean;
  privacyBusy: boolean;
  upgradeNeeded: boolean;
  onTogglePrivacy: () => void;
  onUpgrade: () => void;
}): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="neutral" icon={isPrivate ? <Lock /> : <Globe />}>
        {isPrivate ? 'Private' : 'Public by link'}
      </Badge>
      {upgradeNeeded ? (
        <Button variant="ghost" size="sm" onClick={onUpgrade} className={TOUCH} title="Private projects require Pro">
          Upgrade to keep private
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePrivacy}
          loading={privacyBusy}
          className={TOUCH}
        >
          {isPrivate ? 'Make public' : 'Make private'}
        </Button>
      )}
    </div>
  );
}

/** "Keep this model" in the /p/<slug> side panel. A visitor who does not own
 *  the project yet can save it to an account; the owner sees that it is
 *  saved and who can see it. Nothing for a project someone else owns. */
export function KeepThisModel(props: KeepThisModelProps): ReactNode {
  const { ownership, session } = props;
  if (ownership === 'other') return null;
  if (ownership === 'claimed') {
    return (
      <div className="flex flex-col gap-2">
        <SavedLine />
        <a href="/me" className="text-ui text-accent underline-offset-2 hover:underline">Open your projects</a>
      </div>
    );
  }
  if (ownership === 'owner') {
    return (
      <div className="flex flex-col gap-3">
        <SavedLine />
        <PrivacyRow
          isPrivate={props.project.privacy === 'private'}
          privacyBusy={props.privacyBusy}
          upgradeNeeded={props.upgradeNeeded}
          onTogglePrivacy={props.onTogglePrivacy}
          onUpgrade={props.onUpgrade}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3" data-testid="keep-this-model">
      <div className="flex flex-col gap-1">
        <h3 className={SECTION_TITLE}>Keep this model</h3>
        <p className={SECTION_TEXT}>
          {session
            ? 'It is not in an account yet. Save it to find it again in your projects.'
            : 'It is not in an account yet. Sign in to save it to your projects.'}
        </p>
      </div>
      {session ? (
        <Button variant="secondary" size="lg" onClick={props.onClaim} loading={props.claiming} className="w-full">
          Save to my projects
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <SignInButton
            redirectTo={typeof window !== 'undefined' ? claimReturnUrl(window.location.href) : undefined}
            className={cx(buttonClass('secondary', 'lg'), 'w-full')}
          >
            Sign in to keep
          </SignInButton>
          <a href={signInHref(props.slug)} className="self-center text-2xs text-fg-2 underline-offset-2 hover:text-fg hover:underline">
            Other ways to sign in
          </a>
        </div>
      )}
    </div>
  );
}
