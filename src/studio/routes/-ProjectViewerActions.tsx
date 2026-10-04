// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useState, type ReactNode } from 'react';
import type { ProjectRow } from '../../funnel/lib/apiClient';
import { useOptionalSession } from '../../funnel/hooks/useSession';
import { Link2 } from 'lucide-react';
import { ProjectGalleryControls, type GalleryControlsLook } from './-ProjectGalleryControls';

const BTN_CLASS: Record<GalleryControlsLook, string> = {
  header:
    'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors',
  panel:
    'focus-ring inline-flex h-control-md shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control border border-border-strong bg-surface-1 px-3 text-ui font-medium text-fg enabled:hover:bg-surface-2 disabled:opacity-50 transition-colors max-md:h-touch',
};

export interface ProjectViewerActionsProps {
  slug: string;
  project: ProjectRow;
  /** The dark Studio header (default) or the /p/<slug> side panel. */
  look?: GalleryControlsLook;
}

function isPublic(privacy: ProjectRow['privacy']): boolean {
  return (
    privacy === 'public' ||
    privacy === 'public_unlisted' ||
    privacy === 'public_featured'
  );
}

/** Gallery controls (Remix, Publish, Report) and the Share affordance rendered
 *  in the /p/:slug header's right slot, alongside the existing
 *  claim/save/privacy buttons. */
export function ProjectViewerActions({
  slug,
  project,
  look = 'header',
}: ProjectViewerActionsProps): ReactNode {
  const [copied, setCopied] = useState(false);
  const { session, loading: sessionLoading } = useOptionalSession();

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

  const panel = look === 'panel';
  const icon = panel ? <Link2 className="size-4" strokeWidth={1.75} aria-hidden="true" /> : null;
  const share = sharePublic ? (
    <button type="button" onClick={handleShare} className={BTN_CLASS[look]}>
      {icon}
      {copied ? 'Link copied' : 'Share'}
    </button>
  ) : (
    <button
      type="button"
      disabled
      className={BTN_CLASS[look]}
      title="Make this project public to share a link"
    >
      {icon}
      Share
    </button>
  );

  return (
    <div className={panel ? 'flex flex-wrap items-center gap-2 min-w-0' : 'flex items-center gap-2 min-w-0'}>
      {panel && share}
      <ProjectGalleryControls
        slug={slug}
        project={project}
        session={session}
        sessionLoading={sessionLoading}
        look={look}
      />
      {!panel && share}
    </div>
  );
}
