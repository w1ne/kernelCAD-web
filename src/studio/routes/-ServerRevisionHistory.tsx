// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, History, RotateCcw } from 'lucide-react';
import {
  listProjectRevisions,
  restoreProjectRevision,
  fetchProjectBySlug,
  type ProjectRevision,
} from '../../funnel/lib/apiClient';

export interface ServerRevisionHistoryProps {
  slug: string;
  /** Called with the restored project's current_code so the viewer can
   *  re-render the 3D model to that revision (via the liveCode mechanism). */
  onRestored: (code: string) => void;
}

function formatRevisionTime(ts: string): string {
  const date = new Date(ts);
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

interface RevisionMenuProps {
  revisions: ProjectRevision[];
  restoring: number | null;
  onRestore: (version: number) => void;
}

/** The open dropdown panel: header row + one restorable row per revision. */
function RevisionMenu({ revisions, restoring, onRestore }: RevisionMenuProps): ReactNode {
  return (
    <div
      role="menu"
      className="absolute right-0 top-full mt-1 w-64 max-h-80 overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded shadow-lg z-50 py-1"
      data-testid="server-history-dropdown"
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 font-medium">
        Revision history
      </div>
      {revisions.map((rev) => (
        <div
          key={rev.version}
          className="group flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-[#222]"
        >
          <div className="min-w-0">
            <div className="text-xs text-gray-300">v{rev.version}</div>
            <div className="text-[10px] text-gray-500 truncate">{formatRevisionTime(rev.created_at)}</div>
          </div>
          <button
            type="button"
            onClick={() => onRestore(rev.version)}
            disabled={restoring !== null}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white px-1.5 py-1 rounded hover:bg-[#333] transition-colors shrink-0 disabled:opacity-50"
            aria-label={`Restore revision v${rev.version}`}
            title={`Restore v${rev.version}`}
          >
            <RotateCcw className="w-3 h-3" />
            {restoring === rev.version ? 'Restoring…' : 'Restore'}
          </button>
        </div>
      ))}
    </div>
  );
}

interface ServerRevisions {
  revisions: ProjectRevision[];
  restoring: number | null;
  /** The last restore failed. */
  failed: boolean;
  reload: () => void;
  restore: (version: number) => Promise<boolean>;
}

/** Revisions of a slug-backed project, newest first, and a restore that
 *  pushes the restored code back into the viewer. */
function useServerRevisions(slug: string, onRestored: (code: string) => void): ServerRevisions {
  const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    listProjectRevisions(slug)
      .then(setRevisions)
      .catch(() => {
        // Transient / unauthorized — leave the list as-is.
      });
  }, [slug]);

  // Load on mount, so the caller knows whether to show the control.
  useEffect(() => {
    reload();
  }, [reload]);

  const restore = useCallback(
    async (version: number): Promise<boolean> => {
      setRestoring(version);
      setFailed(false);
      try {
        await restoreProjectRevision(slug, version);
        const project = await fetchProjectBySlug(slug);
        if (project) onRestored(project.current_code);
        reload();
        return true;
      } catch {
        // Transient — leave the row available to retry.
        setFailed(true);
        return false;
      } finally {
        setRestoring(null);
      }
    },
    [slug, onRestored, reload],
  );

  return { revisions, restoring, failed, reload, restore };
}

/** Server-side revision history dropdown for slug-backed projects, mirroring
 *  the localStorage History dropdown in the Studio Header. Lists Supabase
 *  revisions newest-first; each row can restore that revision server-side and
 *  push the restored code back into the viewer. Hidden when fewer than two
 *  revisions exist (nothing meaningful to move between). */
export function ServerRevisionHistory({
  slug,
  onRestored,
}: ServerRevisionHistoryProps): ReactNode {
  const { revisions, restoring, reload, restore } = useServerRevisions(slug, onRestored);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Refresh when the menu opens.
  useEffect(() => {
    if (open) reload();
  }, [open, reload]);

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
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

  const handleRestore = useCallback(
    async (version: number) => {
      if (await restore(version)) setOpen(false);
    },
    [restore],
  );

  // History is only meaningful once there are at least two distinct revisions
  // to move between.
  if (revisions.length < 2) return null;

  return (
    <div className="relative" ref={ref} data-testid="server-history-menu">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`p-1 rounded transition-colors ${open ? 'bg-[#333] text-white' : 'text-gray-400 hover:text-white hover:bg-[#333]'}`}
        aria-label="Revision history"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Revision history"
        data-testid="server-history-button"
      >
        <History className="w-4 h-4" />
      </button>
      {open && (
        <RevisionMenu revisions={revisions} restoring={restoring} onRestore={handleRestore} />
      )}
    </div>
  );
}

/** Revision history as a disclosure list for the /p/<slug> side panel:
 *  "Revisions (n)", then one row per revision with Restore. The newest row
 *  is the one on screen. Hidden with fewer than two revisions. */
export function ServerRevisionList({
  slug,
  onRestored,
}: ServerRevisionHistoryProps): ReactNode {
  const { revisions, restoring, failed, restore } = useServerRevisions(slug, onRestored);
  const [open, setOpen] = useState(false);
  const listId = `revisions-${slug}`;
  if (revisions.length < 2) return null;
  const newest = revisions[0]?.version;

  return (
    <div data-testid="server-history-list">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="focus-ring flex h-control-md w-full items-center gap-2 rounded-control px-2 text-left text-ui text-fg hover:bg-surface-2 max-md:h-touch"
      >
        <History className="size-4 text-fg-2" strokeWidth={1.75} aria-hidden="true" />
        <span className="flex-1">Revisions ({revisions.length})</span>
        <ChevronRight
          className={`size-4 text-fg-3 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul id={listId} className="mt-1 flex flex-col">
          {revisions.map((rev) => (
            <li key={rev.version} className="flex items-center gap-3 rounded-control py-1.5 pl-8 pr-1">
              <div className="min-w-0 flex-1">
                <div className="text-ui text-fg">
                  r{rev.version}
                  {rev.version === newest && <span className="ml-2 text-2xs text-fg-3">current</span>}
                </div>
                <div className="truncate text-2xs text-fg-3">{formatRevisionTime(rev.created_at)}</div>
              </div>
              {rev.version !== newest && (
                <button
                  type="button"
                  onClick={() => void restore(rev.version)}
                  disabled={restoring !== null}
                  aria-label={`Restore revision r${rev.version}`}
                  className="focus-ring inline-flex h-control-sm items-center gap-1 rounded-control px-2 text-2xs font-medium text-fg-2 hover:bg-surface-2 hover:text-fg disabled:opacity-50"
                >
                  <RotateCcw className="size-3" strokeWidth={1.75} aria-hidden="true" />
                  {restoring === rev.version ? 'Restoring…' : 'Restore'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {failed && (
        <p role="alert" className="mt-1 pl-8 text-2xs text-danger">Could not restore. Try again.</p>
      )}
    </div>
  );
}
