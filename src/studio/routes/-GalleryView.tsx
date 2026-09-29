// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Public community gallery (/gallery): published models as cards, three sort
// tabs, and "Load more" paging over the server's cursor. The card itself opens
// the model's /p/<slug> page; its ⋯ menu has Remix, which copies the model into
// the viewer's projects there. Loading shows skeleton cards, a failure an
// ErrorState with Retry, and an empty gallery explains how to publish a model.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, GitFork, LayoutGrid, Link2, PlugZap, Star } from 'lucide-react';
import { fetchGallery, type GalleryItem, type GallerySort } from '../../funnel/lib/apiClient';
import {
  Badge,
  Button,
  buttonClass,
  cx,
  EmptyState,
  ErrorState,
  SkeletonCard,
  TabPanel,
  Tabs,
  ToastProvider,
  useToast,
  type MenuEntry,
  type TabItem,
} from '../../ui';
import { ProjectCard } from '../components/ProjectCard';
import { projectHref, projectRemixHref } from '../components/projectCardModel';

const GALLERY_TABS: ReadonlyArray<{ sort: GallerySort; label: string }> = [
  { sort: 'new', label: 'New' },
  { sort: 'remixed', label: 'Most remixed' },
  { sort: 'featured', label: 'Featured' },
];

const TAB_ITEMS: readonly TabItem[] = GALLERY_TABS.map(t => ({ id: t.sort, label: t.label }));

const TABS_ID = 'gallery-sort';
const GALLERY_PAGE_SIZE = 24;
/** Skeleton cards while the first page loads: two rows on desktop. */
const SKELETON_COUNT = 8;
const GRID = 'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4';

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

function KernelCadMark(): ReactNode {
  return (
    <svg className="size-4 text-fg" viewBox="0 0 84 84" fill="none" aria-hidden="true">
      <path d="M 14,12 L 26,12 L 26,34 Q 26,36 27.5,34.5 L 46,12 L 60,12 L 36,40 Q 35,42 36,44 L 60,72 L 46,72 L 27.5,49.5 Q 26,48 26,50 L 26,72 L 14,72 Z" fill="currentColor"/>
    </svg>
  );
}

function GalleryHeader(): ReactNode {
  return (
    <header className="border-b border-border bg-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <a href="/" className="focus-ring flex items-center gap-2 rounded-control font-serif text-base font-medium text-fg no-underline">
          <KernelCadMark />
          <span>kernel<span className="text-accent">CAD</span></span>
        </a>
        <nav aria-label="Site" className="flex min-w-0 items-center gap-2 md:gap-4">
          <a href="/me" className="focus-ring hidden rounded-control text-ui text-fg-2 no-underline hover:text-fg sm:inline">
            Your projects
          </a>
          <a href="/studio" className={cx(buttonClass('secondary', 'sm'), 'no-underline hover:bg-surface-2 max-md:h-touch max-md:px-3')}>
            Open Studio
          </a>
        </nav>
      </div>
    </header>
  );
}

function GalleryCard({ item }: { item: GalleryItem }): ReactNode {
  const toast = useToast();
  const copyLink = (): void => {
    const url = `${window.location.origin}${projectHref(item.slug)}`;
    navigator.clipboard.writeText(url).then(
      () => toast.show({ tone: 'success', title: 'Link copied' }),
      () => toast.show({ tone: 'error', title: 'Could not copy the link', description: url }),
    );
  };
  const menu: MenuEntry[] = [
    { id: 'remix', label: 'Remix into my projects', icon: <GitFork />, onSelect: () => window.location.assign(projectRemixHref(item.slug)) },
    { id: 'copy-link', label: 'Copy link', icon: <Link2 />, onSelect: copyLink },
  ];
  const meta = (
    <>
      {item.featured && <Badge tone="accent" icon={<Star strokeWidth={2} />}>Featured</Badge>}
      <span className="min-w-0 truncate">by {item.ownerName ?? 'anonymous'}</span>
      <span
        className="inline-flex items-center gap-1"
        data-testid="gallery-remix-count"
        title={remixLabel(item.remixCount)}
      >
        <GitFork className="size-3" strokeWidth={2} aria-hidden="true" />
        <span className="sr-only">{remixLabel(item.remixCount)}</span>
        <span aria-hidden="true">{item.remixCount}</span>
      </span>
      {item.forkedFrom && (
        <span className="w-full min-w-0 truncate">
          Remix of{' '}
          <a href={projectHref(item.forkedFrom.slug)} className="focus-ring rounded-control text-fg-2 hover:text-fg">
            {item.forkedFrom.title}
          </a>
        </span>
      )}
    </>
  );
  return (
    <li className="flex min-w-0">
      <ProjectCard
        slug={item.slug}
        title={item.title}
        renderUrl={item.renderUrl}
        clipUrl={item.clipUrl ?? null}
        meta={meta}
        menu={menu}
        compact
        testId="gallery-card"
      />
    </li>
  );
}

interface GalleryListState {
  items: GalleryItem[];
  nextCursor: string | null;
  status: 'loading' | 'ready' | 'error' | 'loading-more' | 'more-error';
  /** Why the first page failed, for the error id. */
  error?: string;
}

const LOADING: GalleryListState = { items: [], nextCursor: null, status: 'loading' };

function errorText(err: unknown): string {
  return (err instanceof Error ? err.message : String(err)).slice(0, 200);
}

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
      .catch((err: unknown) => {
        if (gen === generation.current) setList({ items: [], nextCursor: null, status: 'error', error: errorText(err) });
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

function GalleryLoading(): ReactNode {
  return (
    <div role="status" aria-label="Loading the gallery" className={cx(GRID, 'mt-6')}>
      {Array.from({ length: SKELETON_COUNT }, (_, i) => <SkeletonCard key={i} label="Loading model" />)}
    </div>
  );
}

const PUBLISH_STEPS: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: 'Make a model',
    text: 'Ask your chat agent for a part, or describe it to the hosted agent. The project is saved to Your projects.',
  },
  {
    title: 'Open it once',
    text: 'Studio captures a preview image in a few seconds. The project must be public by link, which is the default.',
  },
  {
    title: 'Publish it',
    text: 'In Your projects, open the ⋯ menu of the card and choose "Publish to gallery". The model page has the same button.',
  },
];

/** The whole gallery is empty: say what it is, how to publish, and where to start. */
function GalleryEmpty(): ReactNode {
  return (
    <section
      data-testid="gallery-empty"
      aria-labelledby="gallery-empty-title"
      className="mt-6 grid gap-6 rounded-panel border border-border bg-surface-1 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-10 md:p-8"
    >
      <div className="flex min-w-0 flex-col items-start gap-3">
        <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <LayoutGrid className="size-6" strokeWidth={1.75} />
        </span>
        <h2 id="gallery-empty-title" className="font-serif text-heading text-fg">
          No models here yet. Yours can be the first.
        </h2>
        <p className="text-body text-fg-2">
          The gallery shows models that people make with kernelCAD and choose to share. Anyone can open a
          model, turn it around, change its sizes, download it, or remix it into a project of their own.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href="/connect"
            className={cx(buttonClass('primary', 'lg'), 'no-underline hover:bg-accent-hover max-md:h-touch')}
          >
            <PlugZap className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Connect your agent
          </a>
          <a
            href="/me"
            className="focus-ring inline-flex items-center gap-1 rounded-control text-ui font-medium text-accent no-underline hover:underline max-md:min-h-touch"
          >
            Go to your projects <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="text-2xs font-medium uppercase tracking-wide text-fg-3">How to publish a model</h3>
        <ol className="mt-3 flex flex-col gap-3">
          {PUBLISH_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-panel border border-border bg-bg p-4">
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-strong font-mono text-code text-fg-2"
              >
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-ui font-medium text-fg">{step.title}</p>
                <p className="mt-0.5 text-ui text-fg-2">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function GalleryBody({ sort, list, onRetry, onLoadMore, onShowNew }: {
  sort: GallerySort;
  list: GalleryListState;
  onRetry: () => void;
  onLoadMore: () => void;
  onShowNew: () => void;
}): ReactNode {
  if (list.status === 'loading') return <GalleryLoading />;
  if (list.status === 'error') {
    return (
      <ErrorState
        className="mt-6"
        title="Could not load the gallery"
        description="The gallery server did not answer. Your own projects are not affected. Try again in a moment."
        onRetry={onRetry}
        secondaryAction={(
          <a href="/studio" className={cx(buttonClass('secondary', 'md'), 'no-underline hover:bg-surface-2')}>
            Open Studio
          </a>
        )}
        errorId={list.error}
      />
    );
  }
  if (list.items.length === 0) {
    if (sort === 'featured') {
      return (
        <div data-testid="gallery-empty">
          <EmptyState
            className="mt-6"
            icon={<Star strokeWidth={1.75} />}
            title="No featured models yet"
            description="We feature models that show what kernelCAD can do. Until then, look at the newest models."
            action={<Button variant="primary" onClick={onShowNew}>See new models</Button>}
          />
        </div>
      );
    }
    return <GalleryEmpty />;
  }
  return (
    <>
      <ul className={cx(GRID, 'mt-6')}>
        {list.items.map(item => <GalleryCard key={item.slug} item={item} />)}
      </ul>
      {(list.nextCursor || list.status === 'more-error') && (
        <div className="mt-10 flex flex-col items-center gap-2">
          {list.status === 'more-error' && (
            <p className="text-ui text-danger" role="alert">Could not load more models.</p>
          )}
          <Button
            variant="secondary"
            size="lg"
            onClick={onLoadMore}
            loading={list.status === 'loading-more'}
            className="max-md:h-touch"
          >
            {list.status === 'more-error' ? 'Try again' : 'Load more'}
          </Button>
        </div>
      )}
    </>
  );
}

function GalleryPage(): ReactNode {
  const { sort, list, selectSort, retry, loadMore } = useGalleryList();

  return (
    <main data-theme="light" className="min-h-screen bg-bg font-sans text-fg">
      <GalleryHeader />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 md:px-8 md:pt-12">
        <h1 className="font-serif text-section text-fg">Gallery</h1>
        <p className="mt-2 max-w-2xl text-body text-fg-2">
          Models people built with kernelCAD. Open one to look inside and change its sizes, or remix it into your own project.
        </p>

        <Tabs
          id={TABS_ID}
          label="Sort models"
          items={TAB_ITEMS}
          value={sort}
          onChange={id => { if (isGallerySort(id) && id !== sort) selectSort(id); }}
          className="mt-6 overflow-x-auto"
        />
        <TabPanel tabsId={TABS_ID} id={sort} value={sort} className="rounded-panel">
          <GalleryBody
            sort={sort}
            list={list}
            onRetry={retry}
            onLoadMore={loadMore}
            onShowNew={() => selectSort('new')}
          />
        </TabPanel>
      </div>
    </main>
  );
}

export function GalleryView(): ReactNode {
  return (
    <ToastProvider>
      <GalleryPage />
    </ToastProvider>
  );
}
