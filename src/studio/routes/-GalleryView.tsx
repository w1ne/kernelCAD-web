// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Public community gallery (/gallery): published models as cards, three sort
// tabs, and "Load more" paging over the server's cursor. Each card opens the
// model's /p/<slug> page, where Remix copies it into the viewer's projects.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GitFork } from 'lucide-react';
import { fetchGallery, type GalleryItem, type GallerySort } from '../../funnel/lib/apiClient';

const GALLERY_TABS: ReadonlyArray<{ sort: GallerySort; label: string }> = [
  { sort: 'new', label: 'New' },
  { sort: 'remixed', label: 'Most remixed' },
  { sort: 'featured', label: 'Featured' },
];

const GALLERY_PAGE_SIZE = 24;

function isGallerySort(v: string | null): v is GallerySort {
  return GALLERY_TABS.some(t => t.sort === v);
}

/** Initial tab from `?sort=`, so a tab can be linked to. */
function initialSort(): GallerySort {
  if (typeof window === 'undefined') return 'new';
  const v = new URLSearchParams(window.location.search).get('sort');
  return isGallerySort(v) ? v : 'new';
}

function syncSortToUrl(sort: GallerySort): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (sort === 'new') url.searchParams.delete('sort');
  else url.searchParams.set('sort', sort);
  window.history.replaceState(window.history.state, '', url.toString());
}

function remixLabel(n: number): string {
  return n === 1 ? '1 remix' : `${n} remixes`;
}

function GalleryCard({ item }: { item: GalleryItem }): ReactNode {
  return (
    <li className="rounded-xl border border-rule bg-white overflow-hidden hover:border-ink transition-colors">
      <a href={`/p/${encodeURIComponent(item.slug)}`} className="block no-underline" data-testid="gallery-card">
        <div className="aspect-[4/3] bg-vellum border-b border-rule flex items-center justify-center">
          {item.renderUrl ? (
            <img
              src={item.renderUrl}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="font-mono text-[11px] text-ink-faint">No preview</span>
          )}
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="font-serif font-medium text-ink text-base leading-snug break-words min-w-0">{item.title}</p>
            {item.featured && (
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-blueprint border border-blueprint/40 rounded px-1.5 py-0.5">
                Featured
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] text-ink-faint mt-1.5 tracking-wide flex items-center gap-2 flex-wrap">
            <span>by {item.ownerName ?? 'anonymous'}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1" data-testid="gallery-remix-count">
              <GitFork size={11} aria-hidden="true" />
              {remixLabel(item.remixCount)}
            </span>
          </p>
          {item.forkedFrom && (
            <p className="font-mono text-[11px] text-ink-faint mt-1 truncate">
              Remix of {item.forkedFrom.title}
            </p>
          )}
        </div>
      </a>
    </li>
  );
}

interface GalleryListState {
  items: GalleryItem[];
  nextCursor: string | null;
  status: 'loading' | 'ready' | 'error' | 'loading-more' | 'more-error';
}

const LOADING: GalleryListState = { items: [], nextCursor: null, status: 'loading' };

/** Sort tab + paged list. State is set from event handlers and fetch
 *  callbacks only (react-hooks/set-state-in-effect). */
function useGalleryList() {
  const [sort, setSort] = useState<GallerySort>(initialSort);
  const [reloadKey, setReloadKey] = useState(0);
  const [list, setList] = useState<GalleryListState>(LOADING);
  // Bumped whenever the list restarts, so a late "Load more" response for a
  // tab the viewer already left is dropped.
  const generation = useRef(0);

  useEffect(() => {
    const gen = ++generation.current;
    fetchGallery(sort, null, GALLERY_PAGE_SIZE)
      .then(page => {
        if (gen === generation.current) setList({ items: page.items, nextCursor: page.nextCursor, status: 'ready' });
      })
      .catch(() => {
        if (gen === generation.current) setList({ items: [], nextCursor: null, status: 'error' });
      });
  }, [sort, reloadKey]);

  const selectSort = useCallback((next: GallerySort) => {
    setSort(next);
    setList(LOADING);
    syncSortToUrl(next);
  }, []);

  const retry = useCallback(() => {
    setList(LOADING);
    setReloadKey(k => k + 1);
  }, []);

  const loadMore = useCallback(() => {
    const cursor = list.nextCursor;
    if (!cursor) return;
    const gen = generation.current;
    setList(l => ({ ...l, status: 'loading-more' }));
    fetchGallery(sort, cursor, GALLERY_PAGE_SIZE)
      .then(page => {
        if (gen !== generation.current) return;
        setList(l => ({ items: [...l.items, ...page.items], nextCursor: page.nextCursor, status: 'ready' }));
      })
      .catch(() => {
        if (gen === generation.current) setList(l => ({ ...l, status: 'more-error' }));
      });
  }, [sort, list.nextCursor]);

  return { sort, list, selectSort, retry, loadMore };
}

function GalleryBody({ sort, list, onRetry, onLoadMore }: {
  sort: GallerySort;
  list: GalleryListState;
  onRetry: () => void;
  onLoadMore: () => void;
}): ReactNode {
  if (list.status === 'loading') {
    return <p className="text-ink-faint font-mono text-sm mt-8" role="status">Loading…</p>;
  }
  if (list.status === 'error') {
    return (
      <div className="mt-8" role="alert">
        <p className="text-copper font-mono text-sm">Could not load the gallery.</p>
        <button type="button" onClick={onRetry} className="mt-2 font-mono text-xs underline text-ink-soft hover:text-ink">
          Retry
        </button>
      </div>
    );
  }
  if (list.items.length === 0) {
    return (
      <p className="text-ink-soft mt-8" data-testid="gallery-empty">
        {sort === 'featured'
          ? 'No featured models yet.'
          : 'No models published yet. Open one of your projects and choose "Publish to gallery".'}
      </p>
    );
  }
  return (
    <>
      <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.items.map(item => <GalleryCard key={item.slug} item={item} />)}
      </ul>
      {(list.nextCursor || list.status === 'more-error') && (
        <div className="mt-8 flex flex-col items-center gap-2">
          {list.status === 'more-error' && (
            <p className="text-copper font-mono text-xs" role="alert">Could not load more.</p>
          )}
          <button
            type="button"
            onClick={onLoadMore}
            disabled={list.status === 'loading-more'}
            className="rounded-md border border-rule px-4 py-2 font-mono text-xs tracking-wide text-ink-soft hover:border-ink hover:text-ink disabled:opacity-50 transition-colors"
          >
            {list.status === 'loading-more' ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}

export function GalleryView(): ReactNode {
  const { sort, list, selectSort, retry, loadMore } = useGalleryList();

  return (
    <main className="min-h-screen bg-vellum text-ink font-sans">
      <header className="border-b border-rule px-4 sm:px-6 py-3 flex items-center justify-between bg-vellum">
        <a href="/" className="flex items-center gap-2 font-serif text-base font-medium no-underline text-ink">
          <svg className="w-4 h-4 text-ink" viewBox="0 0 84 84" fill="none" aria-label="kernelCAD">
            <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
          </svg>
          <span>kernel<span className="text-blueprint">CAD</span></span>
        </a>
        <a href="/" className="font-mono text-xs tracking-wide text-ink-soft hover:text-ink">Open Studio</a>
      </header>

      <section className="px-4 sm:px-6 py-10 max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-medium text-ink">Gallery</h1>
        <p className="text-ink-soft mt-2 max-w-2xl">
          Models people built with kernelCAD. Open one to look inside, or remix it into your own project.
        </p>

        <div role="tablist" aria-label="Sort" className="mt-6 flex gap-1 border-b border-rule overflow-x-auto">
          {GALLERY_TABS.map(tab => (
            <button
              key={tab.sort}
              type="button"
              role="tab"
              aria-selected={tab.sort === sort}
              onClick={() => selectSort(tab.sort)}
              className={`whitespace-nowrap px-3 py-2 font-mono text-xs tracking-wide border-b-2 -mb-px transition-colors ${
                tab.sort === sort ? 'border-ink text-ink' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {tab.sort === 'remixed' ? <GitFork size={11} className="inline mr-1" aria-hidden="true" /> : null}
              {tab.label}
            </button>
          ))}
        </div>

        <GalleryBody
          sort={sort}
          list={list}
          onRetry={retry}
          onLoadMore={loadMore}
        />
      </section>
    </main>
  );
}
