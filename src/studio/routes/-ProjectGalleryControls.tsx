// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Community-gallery controls in the /p/:slug header: Remix (everyone), owner
// Publish/Unpublish, the "Remixed from" credit link, and Report.
//
// Remix while signed out goes through sign-in and comes back to
// /p/<slug>?remix=1, which finishes the remix once the session is there. The
// embed's "Remix in kernelCAD" link lands on the same URL.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Flag, GitFork, LayoutGrid } from 'lucide-react';
import { SignInButton } from '../../funnel/components/SignInButton';
import {
  fetchProjectGalleryState,
  remixProject,
  reportProject,
  setProjectGalleryListed,
  GALLERY_HIDDEN,
  GALLERY_NOT_PUBLIC,
  GALLERY_RENDER_REQUIRED,
  type ProjectGalleryState,
  type ProjectRow,
} from '../../funnel/lib/apiClient';

/** Where the controls sit: the dark Studio header, or the /p/<slug> side
 *  panel (semantic tokens, full labels, 44 px targets on a phone). */
export type GalleryControlsLook = 'header' | 'panel';

interface LookClasses {
  button: string;
  quiet: string;
  /** Label text that the header hides on narrow screens. */
  label: string;
  reportLabel: string;
  form: string;
  formLabel: string;
  textarea: string;
  note: string;
  error: string;
  credit: string;
  row: string;
}

const PANEL_BUTTON =
  'focus-ring inline-flex h-control-md shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border border-border-strong bg-surface-1 px-3 text-ui font-medium text-fg enabled:hover:bg-surface-2 disabled:opacity-50 transition-colors max-md:h-touch';

const LOOKS: Record<GalleryControlsLook, LookClasses> = {
  header: {
    button: 'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors',
    quiet: 'inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded text-xs text-fg-2 hover:text-fg disabled:opacity-50 transition-colors',
    label: 'hidden md:inline',
    reportLabel: 'hidden lg:inline',
    form: 'absolute right-0 top-full mt-1 z-50 w-64 rounded border border-border bg-surface-2 p-2 shadow-lg flex flex-col gap-2',
    formLabel: 'text-[11px] text-fg',
    textarea: 'w-full rounded bg-black/40 border border-border-strong p-1.5 text-xs text-fg',
    note: 'text-[11px] text-fg-3 font-mono whitespace-nowrap',
    error: 'text-[11px] text-red-400',
    credit: 'hidden md:inline truncate max-w-[180px] text-[11px] text-fg-2 hover:text-fg underline decoration-dotted',
    row: 'flex items-center gap-2 min-w-0',
  },
  panel: {
    button: PANEL_BUTTON,
    quiet: 'focus-ring inline-flex h-control-md shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-2 text-ui text-fg-2 enabled:hover:bg-surface-2 enabled:hover:text-fg disabled:opacity-50 transition-colors max-md:h-touch',
    label: 'inline',
    reportLabel: 'inline',
    form: 'mt-2 flex w-full flex-col gap-2 rounded-panel border border-border bg-surface-2 p-3',
    formLabel: 'text-ui text-fg',
    textarea: 'focus-ring w-full rounded-control border border-border-strong bg-surface-1 p-2 text-ui text-fg',
    note: 'text-ui text-fg-3',
    error: 'text-2xs text-danger',
    credit: 'block w-full truncate text-ui text-fg-2 underline decoration-dotted hover:text-fg',
    row: 'flex flex-wrap items-center gap-2 min-w-0',
  },
};

/** Query flag that resumes a remix after the sign-in round trip. */
const REMIX_QUERY_PARAM = 'remix';

/** The page captures a render a few seconds after load; re-check once after
 *  this delay so an owner's Publish button enables without a reload. */
const RENDER_RECHECK_MS = 15_000;

function remixContinueUrl(slug: string): string {
  if (typeof window === 'undefined') return `/p/${slug}?${REMIX_QUERY_PARAM}=1`;
  return `${window.location.origin}/p/${encodeURIComponent(slug)}?${REMIX_QUERY_PARAM}=1`;
}

function hasRemixParam(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get(REMIX_QUERY_PARAM) === '1';
}

function isPublic(privacy: ProjectRow['privacy']): boolean {
  return privacy === 'public' || privacy === 'public_unlisted' || privacy === 'public_featured';
}

/** Why the owner's Publish button is disabled, or null when it is usable. */
function publishBlocker(project: ProjectRow, state: ProjectGalleryState): string | null {
  if (state.listed) return null; // Unpublish is always allowed.
  if (state.hidden) return 'Hidden from the gallery by moderation';
  if (!isPublic(project.privacy)) return 'Make the project public to publish it';
  if (!state.hasRender) return 'Waiting for a preview image. Keep this page open a few seconds.';
  return null;
}

function publishErrorHint(message: string): string {
  if (message.includes(GALLERY_RENDER_REQUIRED)) return 'Needs a preview image first';
  if (message.includes(GALLERY_NOT_PUBLIC)) return 'Make the project public first';
  if (message.includes(GALLERY_HIDDEN)) return 'Hidden by moderation';
  return 'Could not update the gallery';
}

function useGalleryState(slug: string, session: Session | null) {
  const [state, setState] = useState<ProjectGalleryState | null>(null);
  const userId = session?.user.id ?? null;

  // Re-read when the viewer signs in or out: owner fields depend on it. State
  // is set only from the fetch callbacks (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    fetchProjectGalleryState(slug)
      .then(next => { if (!cancelled) setState(next); })
      // Gallery state is decoration on this page: without it, Remix and
      // Report still work and the owner controls stay hidden.
      .catch(() => { if (!cancelled) setState(null); });
    return () => { cancelled = true; };
  }, [slug, userId]);

  // Owner waiting on the first render capture: check once more.
  const waitingForRender = !!state && state.isOwner && !state.listed && !state.hasRender;
  useEffect(() => {
    if (!waitingForRender || typeof window === 'undefined') return;
    const t = window.setTimeout(() => {
      fetchProjectGalleryState(slug).then(setState).catch(() => {});
    }, RENDER_RECHECK_MS);
    return () => window.clearTimeout(t);
  }, [waitingForRender, slug]);

  return { state, setState };
}

/** Open the new project. After the sign-in round trip, replace the ?remix=1
 *  entry so Back does not start a second remix. */
function openRemix(newSlug: string, replace: boolean): void {
  const target = `/p/${encodeURIComponent(newSlug)}`;
  if (replace) window.location.replace(target);
  else window.location.assign(target);
}

function RemixControl({ slug, session, sessionLoading, look }: {
  slug: string;
  session: Session | null;
  sessionLoading: boolean;
  look: LookClasses;
}): ReactNode {
  // Starts busy when resuming a remix after sign-in, so the button can't be
  // clicked into a second remix meanwhile.
  const [busy, setBusy] = useState(hasRemixParam);
  const [failed, setFailed] = useState(false);
  const resumed = useRef(false);

  const onFailed = useCallback(() => {
    setFailed(true);
    setBusy(false);
  }, []);

  const handleClick = useCallback(() => {
    setBusy(true);
    setFailed(false);
    remixProject(slug).then(r => openRemix(r.slug, false)).catch(onFailed);
  }, [slug, onFailed]);

  useEffect(() => {
    if (resumed.current || sessionLoading || !session || !hasRemixParam()) return;
    resumed.current = true;
    remixProject(slug).then(r => openRemix(r.slug, true)).catch(onFailed);
  }, [slug, session, sessionLoading, onFailed]);

  const label = (
    <>
      <GitFork size={12} aria-hidden="true" />
      <span className={look.label}>{busy ? 'Remixing…' : failed ? 'Remix failed, retry' : 'Remix'}</span>
    </>
  );
  const title = 'Copy this model into your own projects';

  if (!session) {
    // Same sign-in button as "Sign in to save"; it comes back to ?remix=1.
    return (
      <span title={`Sign in to remix. ${title}`} className="inline-flex">
        <SignInButton redirectTo={remixContinueUrl(slug)} className={look.button}>
          Remix
        </SignInButton>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={look.button}
      aria-label="Remix"
      title={failed ? 'Remix failed. Try again.' : title}
    >
      {label}
    </button>
  );
}

function PublishToggle({ slug, project, state, onChange, look }: {
  slug: string;
  project: ProjectRow;
  state: ProjectGalleryState;
  onChange: (next: ProjectGalleryState) => void;
  look: LookClasses;
}): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocker = publishBlocker(project, state);
  const label = state.listed ? 'Unpublish' : 'Publish to gallery';

  const toggle = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await setProjectGalleryListed(slug, !state.listed);
      onChange({ ...state, listed: res.listed, listedAt: res.listedAt });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(publishErrorHint(message));
      if (message.includes(GALLERY_RENDER_REQUIRED)) onChange({ ...state, hasRender: false });
    } finally {
      setBusy(false);
    }
  }, [slug, state, onChange]);

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={busy || blocker != null}
      className={look.button}
      aria-label={label}
      title={blocker ?? error ?? (state.listed ? 'Remove from the public gallery' : 'List this model in the public gallery')}
      data-testid="gallery-publish-toggle"
    >
      <LayoutGrid size={12} aria-hidden="true" />
      <span className={look.label}>{busy ? '…' : error ?? label}</span>
    </button>
  );
}

function ReportControl({ slug, look }: { slug: string; look: LookClasses }): ReactNode {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const submit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const text = reason.trim();
    if (!text) return;
    setStatus('sending');
    try {
      await reportProject(slug, text);
      setStatus('sent');
      setOpen(false);
    } catch {
      setStatus('failed');
    }
  }, [slug, reason]);

  if (status === 'sent') {
    return <span className={look.note}>Reported</span>;
  }
  return (
    <span className={open ? 'relative inline-flex flex-col w-full' : 'relative inline-flex'}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={look.quiet}
        aria-label="Report"
        aria-expanded={open}
        title="Report this model"
      >
        <Flag size={12} aria-hidden="true" />
        <span className={look.reportLabel}>Report</span>
      </button>
      {open && (
        <form
          onSubmit={e => void submit(e)}
          className={look.form}
        >
          <label className={look.formLabel} htmlFor={`report-${slug}`}>
            What is wrong with this model?
          </label>
          <textarea
            id={`report-${slug}`}
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className={look.textarea}
          />
          {status === 'failed' && (
            <p className={look.error}>Could not send the report. Try again later.</p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={look.quiet}>
              Cancel
            </button>
            <button type="submit" disabled={!reason.trim() || status === 'sending'} className={look.button}>
              {status === 'sending' ? 'Sending…' : 'Send report'}
            </button>
          </div>
        </form>
      )}
    </span>
  );
}

export interface ProjectGalleryControlsProps {
  slug: string;
  project: ProjectRow;
  session: Session | null;
  sessionLoading: boolean;
  look?: GalleryControlsLook;
}

export function ProjectGalleryControls({
  slug,
  project,
  session,
  sessionLoading,
  look: lookName = 'header',
}: ProjectGalleryControlsProps): ReactNode {
  const { state, setState } = useGalleryState(slug, session);
  const look = LOOKS[lookName];

  return (
    <div className={look.row}>
      {state?.forkedFrom && (
        <a
          href={`/p/${encodeURIComponent(state.forkedFrom.slug)}`}
          className={look.credit}
          title={`Remixed from ${state.forkedFrom.title}`}
          data-testid="remixed-from"
        >
          Remixed from {state.forkedFrom.title}
        </a>
      )}
      <RemixControl slug={slug} session={session} sessionLoading={sessionLoading} look={look} />
      {state?.isOwner && (
        <PublishToggle slug={slug} project={project} state={state} onChange={setState} look={look} />
      )}
      {!state?.isOwner && <ReportControl slug={slug} look={look} />}
    </div>
  );
}
