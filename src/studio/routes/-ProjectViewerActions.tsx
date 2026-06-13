// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState, type ReactNode } from 'react';
import type { ProjectRow } from '../../funnel/lib/apiClient';

const BTN_CLASS =
  'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors';

export interface ProjectViewerActionsProps {
  slug: string;
  project: ProjectRow;
}

function isPublic(privacy: ProjectRow['privacy']): boolean {
  return (
    privacy === 'public' ||
    privacy === 'public_unlisted' ||
    privacy === 'public_featured'
  );
}

/** Share affordance rendered in the /p/:slug header's right slot, alongside the
 *  existing claim/save/privacy buttons. */
export function ProjectViewerActions({
  slug,
  project,
}: ProjectViewerActionsProps): ReactNode {
  const [copied, setCopied] = useState(false);

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
    </div>
  );
}
