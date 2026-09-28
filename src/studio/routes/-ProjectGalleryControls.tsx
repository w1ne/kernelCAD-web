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

const BTN_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors';
const QUIET_BTN_CLASS =
  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap px-1.5 py-0.5 rounded text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50 transition-colors';

/** Query flag that resumes a remix after the sign-in round trip. */
export const REMIX_QUERY_PARAM = 'remix';

/** The page captures a render a few seconds after load; re-check once after
 *  this delay so an owner's Publish button enables without a reload. */
export const RENDER_RECHECK_MS = 15_000;

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

  const reload = useCallback(async () => {
    try {
      setState(await fetchProjectGalleryState(slug));
    } catch {
      // Gallery state is decoration on this page: without it, Remix and
      // Report still work and the owner controls stay hidden.
      setState(null);
    }
  }, [slug]);

  // Re-read when the viewer signs in or out: owner fields depend on it.
  useEffect(() => {
    void reload();
  }, [reload, userId]);

  // Owner waiting on the first render capture: check once more.
  const waitingForRender = !!state && state.isOwner && !state.listed && !state.hasRender;
  useEffect(() => {
    if (!waitingForRender || typeof window === 'undefined') return;
    const t = window.setTimeout(() => void reload(), RENDER_RECHECK_MS);
    return () => window.clearTimeout(t);
  }, [waitingForRender, reload]);

  return { state, setState, reload };
}

function RemixControl({ slug, session, sessionLoading }: {
  slug: string;
  session: Session | null;
  sessionLoading: boolean;
}): ReactNode {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const resumed = useRef(false);

  const remix = useCallback(async (replace: boolean) => {
    setBusy(true);
    setFailed(false);
    try {
      const { slug: newSlug } = await remixProject(slug);
      const target = `/p/${encodeURIComponent(newSlug)}`;
      // After the sign-in round trip, replace the ?remix=1 entry so Back does
      // not start a second remix.
      if (replace) window.location.replace(target);
      else window.location.assign(target);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }, [slug]);

  useEffect(() => {
    if (resumed.current || sessionLoading || !session || !hasRemixParam()) return;
    resumed.current = true;
    void remix(true);
  }, [session, sessionLoading, remix]);

  const label = (
    <>
      <GitFork size={12} aria-hidden="true" />
      <span className="hidden md:inline">{busy ? 'Remixing…' : failed ? 'Remix failed, retry' : 'Remix'}</span>
    </>
  );
  const title = 'Copy this model into your own projects';

  if (!session) {
    // Same sign-in button as "Sign in to save"; it comes back to ?remix=1.
    return (
      <span title={`Sign in to remix. ${title}`} className="inline-flex">
        <SignInButton redirectTo={remixContinueUrl(slug)} className={BTN_CLASS}>
          Remix
        </SignInButton>
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void remix(false)}
      disabled={busy}
      className={BTN_CLASS}
      aria-label="Remix"
      title={failed ? 'Remix failed. Try again.' : title}
    >
      {label}
    </button>
  );
}

function PublishToggle({ slug, project, state, onChange }: {
  slug: string;
  project: ProjectRow;
  state: ProjectGalleryState;
  onChange: (next: ProjectGalleryState) => void;
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
      className={BTN_CLASS}
      aria-label={label}
      title={blocker ?? error ?? (state.listed ? 'Remove from the public gallery' : 'List this model in the public gallery')}
      data-testid="gallery-publish-toggle"
    >
      <LayoutGrid size={12} aria-hidden="true" />
      <span className="hidden md:inline">{busy ? '…' : error ?? label}</span>
    </button>
  );
}

function ReportControl({ slug }: { slug: string }): ReactNode {
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
    return <span className="text-[11px] text-gray-500 font-mono whitespace-nowrap">Reported</span>;
  }
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={QUIET_BTN_CLASS}
        aria-label="Report"
        aria-expanded={open}
        title="Report this model"
      >
        <Flag size={12} aria-hidden="true" />
        <span className="hidden lg:inline">Report</span>
      </button>
      {open && (
        <form
          onSubmit={e => void submit(e)}
          className="absolute right-0 top-full mt-1 z-50 w-64 rounded border border-[#333] bg-[#1a1a1a] p-2 shadow-lg flex flex-col gap-2"
        >
          <label className="text-[11px] text-gray-300" htmlFor={`report-${slug}`}>
            What is wrong with this model?
          </label>
          <textarea
            id={`report-${slug}`}
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded bg-black/40 border border-[#333] p-1.5 text-xs text-gray-100"
          />
          {status === 'failed' && (
            <p className="text-[11px] text-red-400">Could not send the report. Try again later.</p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={QUIET_BTN_CLASS}>
              Cancel
            </button>
            <button type="submit" disabled={!reason.trim() || status === 'sending'} className={BTN_CLASS}>
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
}

export function ProjectGalleryControls({
  slug,
  project,
  session,
  sessionLoading,
}: ProjectGalleryControlsProps): ReactNode {
  const { state, setState } = useGalleryState(slug, session);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {state?.forkedFrom && (
        <a
          href={`/p/${encodeURIComponent(state.forkedFrom.slug)}`}
          className="hidden md:inline truncate max-w-[180px] text-[11px] text-gray-400 hover:text-gray-200 underline decoration-dotted"
          title={`Remixed from ${state.forkedFrom.title}`}
          data-testid="remixed-from"
        >
          Remixed from {state.forkedFrom.title}
        </a>
      )}
      <RemixControl slug={slug} session={session} sessionLoading={sessionLoading} />
      {state?.isOwner && (
        <PublishToggle slug={slug} project={project} state={state} onChange={setState} />
      )}
      {!state?.isOwner && <ReportControl slug={slug} />}
    </div>
  );
}
