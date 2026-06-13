// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { SignInButton } from '../../funnel/components/SignInButton';
import { cloneProject, type ProjectRow } from '../../funnel/lib/apiClient';

const BTN_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors';

export interface ProjectViewerActionsProps {
  slug: string;
  project: ProjectRow;
  session: Session | null;
  /** Navigate to a project page by slug — wraps the router's navigate. */
  onNavigateToSlug: (slug: string) => void;
}

function isPublic(privacy: ProjectRow['privacy']): boolean {
  return (
    privacy === 'public' ||
    privacy === 'public_unlisted' ||
    privacy === 'public_featured'
  );
}

/** Share + Clone affordances rendered in the /p/:slug header's right slot,
 *  alongside the existing claim/save/privacy buttons. */
export function ProjectViewerActions({
  slug,
  project,
  session,
  onNavigateToSlug,
}: ProjectViewerActionsProps): ReactNode {
  const [copied, setCopied] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [cloneErr, setCloneErr] = useState<string | null>(null);

  const sharePublic = isPublic(project.privacy);

  const handleShare = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/p/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (permissions / insecure context) — leave label as-is.
    }
  }, [slug]);

  const handleClone = useCallback(async () => {
    setCloning(true);
    setCloneErr(null);
    try {
      const result = await cloneProject(slug);
      onNavigateToSlug(result.slug);
    } catch (e) {
      setCloneErr(e instanceof Error ? e.message : String(e));
      setCloning(false);
    }
  }, [slug, onNavigateToSlug]);

  return (
    <div className="flex items-center gap-2 min-w-0">
      {sharePublic ? (
        <button type="button" onClick={handleShare} className={BTN_CLASS}>
          {copied ? 'Link copied' : 'Share'}
        </button>
      ) : (
        <button
          type="button"
          disabled
          className={BTN_CLASS}
          title="Make this project public to share a link"
        >
          Share
        </button>
      )}

      {session ? (
        <button type="button" onClick={handleClone} disabled={cloning} className={BTN_CLASS}>
          {cloning ? 'Cloning…' : 'Clone to my projects'}
        </button>
      ) : (
        <SignInButton
          redirectTo={typeof window !== 'undefined' ? window.location.href : undefined}
          className={BTN_CLASS}
        >
          Sign in to clone
        </SignInButton>
      )}

      {cloneErr && (
        <span className="text-[11px] text-copper font-mono whitespace-nowrap">
          Clone failed
        </span>
      )}
    </div>
  );
}
