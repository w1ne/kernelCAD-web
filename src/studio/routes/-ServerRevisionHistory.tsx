// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { History, RotateCcw } from 'lucide-react';
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

/** Server-side revision history dropdown for slug-backed projects, mirroring
 *  the localStorage History dropdown in the Studio Header. Lists Supabase
 *  revisions newest-first; each row can restore that revision server-side and
 *  push the restored code back into the viewer. Hidden when fewer than two
 *  revisions exist (nothing meaningful to move between). */
export function ServerRevisionHistory({
  slug,
  onRestored,
}: ServerRevisionHistoryProps): ReactNode {
  const [revisions, setRevisions] = useState<ProjectRevision[]>([]);
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const loadRevisions = useCallback(() => {
    listProjectRevisions(slug)
      .then(setRevisions)
      .catch(() => {
        // Transient / unauthorized — leave the list as-is.
      });
  }, [slug]);

  // Load on mount (so we know whether to show the control) and refresh on open.
  useEffect(() => {
    loadRevisions();
  }, [loadRevisions]);

  useEffect(() => {
    if (open) loadRevisions();
  }, [open, loadRevisions]);

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
      setRestoring(version);
      try {
        await restoreProjectRevision(slug, version);
        const project = await fetchProjectBySlug(slug);
        if (project) onRestored(project.current_code);
        loadRevisions();
        setOpen(false);
      } catch {
        // Transient — leave the row available to retry.
      } finally {
        setRestoring(null);
      }
    },
    [slug, onRestored, loadRevisions],
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
                onClick={() => handleRestore(rev.version)}
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
      )}
    </div>
  );
}
