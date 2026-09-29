// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GalleryItem, GalleryPage } from '../../funnel/lib/apiClient';

const { fetchGalleryMock } = vi.hoisted(() => ({ fetchGalleryMock: vi.fn() }));
vi.mock('../../funnel/lib/apiClient', () => ({ fetchGallery: fetchGalleryMock }));

import { GalleryView } from './-GalleryView';

const GALLERY_PAGE_SIZE = 24;

function item(n: number, overrides: Partial<GalleryItem> = {}): GalleryItem {
  return {
    slug: `slug-${n}`,
    title: `Model ${n}`,
    ownerName: null,
    renderUrl: `https://cdn.test/${n}.png`,
    remixCount: 0,
    featured: false,
    forkedFrom: null,
    listedAt: '2026-09-20T00:00:00Z',
    createdAt: '2026-09-19T00:00:00Z',
    updatedAt: '2026-09-20T00:00:00Z',
    ...overrides,
  };
}

function page(items: GalleryItem[], nextCursor: string | null = null): GalleryPage {
  return { items, nextCursor };
}

let assignSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchGalleryMock.mockReset();
  window.history.replaceState(null, '', '/gallery');
  assignSpy = vi.spyOn(window.location, 'assign').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

/** The card's title link: the card's primary action. */
function titleLink(card: HTMLElement): HTMLElement {
  return within(card).getByRole('heading').querySelector('a')!;
}

describe('GalleryView', () => {
  it('shows skeleton cards while loading, then cards with title, author, remix count and render', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([
      item(1, { ownerName: 'Alice', remixCount: 3, featured: true }),
      item(2, { renderUrl: null, remixCount: 1, forkedFrom: { slug: 'slug-1', title: 'Model 1' } }),
    ]));
    render(<GalleryView />);
    const loading = screen.getByRole('status', { name: 'Loading the gallery' });
    expect(loading.querySelectorAll('[data-skeleton]').length).toBeGreaterThan(0);

    const cards = await screen.findAllByTestId('gallery-card');
    expect(cards).toHaveLength(2);
    expect(screen.queryByRole('status', { name: 'Loading the gallery' })).toBeNull();
    expect(fetchGalleryMock).toHaveBeenCalledWith('new', null, GALLERY_PAGE_SIZE);
    expect(titleLink(cards[0]!).getAttribute('href')).toBe('/p/slug-1');
    expect(titleLink(cards[0]!).textContent).toBe('Model 1');
    expect(cards[0]!.textContent).toContain('by Alice');
    expect(cards[0]!.textContent).toContain('3 remixes');
    expect(cards[0]!.textContent).toContain('Featured');
    expect(cards[0]!.querySelector('img')!.getAttribute('src')).toBe('https://cdn.test/1.png');
    expect(cards[1]!.textContent).toContain('by anonymous');
    expect(cards[1]!.textContent).toContain('1 remix');
    expect(cards[1]!.textContent).toContain('No preview');
    expect(cards[1]!.textContent).toContain('Remix of Model 1');
    expect(within(cards[1]!).getByRole('link', { name: 'Model 1' }).getAttribute('href')).toBe('/p/slug-1');
  });

  it('lays the cards out in two columns on a phone', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([item(1), item(2)]));
    render(<GalleryView />);
    const [card] = await screen.findAllByTestId('gallery-card');
    const grid = card!.closest('ul')!;
    expect(grid.className.split(/\s+/)).toContain('grid-cols-2');
  });

  it('puts Remix in the card menu; it opens the model page with the remix flag', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([item(1), item(2)]));
    render(<GalleryView />);
    const cards = await screen.findAllByTestId('gallery-card');
    // No Remix button on the card face: only in the menu.
    expect(within(cards[1]!).queryByRole('button', { name: /remix/i })).toBeNull();
    fireEvent.click(within(cards[1]!).getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Remix/ }));
    expect(assignSpy).toHaveBeenCalledWith('/p/slug-2?remix=1');
  });

  it('plays the clip on hover when the model has one, and marks it as animated', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([
      item(1, { clipUrl: 'https://cdn.test/1.mp4' }),
      item(2),
    ]));
    render(<GalleryView />);
    const cards = await screen.findAllByTestId('gallery-card');
    expect(within(cards[0]!).getByTestId('project-card-clip-mark')).toBeTruthy();
    expect(within(cards[1]!).queryByTestId('project-card-clip-mark')).toBeNull();
    expect(within(cards[0]!).queryByTestId('project-card-clip')).toBeNull();

    fireEvent.pointerEnter(cards[0]!);
    const clip = within(cards[0]!).getByTestId('project-card-clip');
    expect(clip.tagName).toBe('VIDEO');
    expect(clip.getAttribute('src')).toBe('https://cdn.test/1.mp4');
    fireEvent.pointerLeave(cards[0]!);
    expect(within(cards[0]!).queryByTestId('project-card-clip')).toBeNull();

    // Keyboard users get the same preview on focus.
    fireEvent.focus(titleLink(cards[0]!));
    expect(within(cards[0]!).getByTestId('project-card-clip')).toBeTruthy();
  });

  it('does not play the clip with reduced motion', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(q => ({
      matches: q.includes('prefers-reduced-motion'),
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList);
    fetchGalleryMock.mockResolvedValueOnce(page([item(1, { clipUrl: 'https://cdn.test/1.webp' })]));
    render(<GalleryView />);
    const [card] = await screen.findAllByTestId('gallery-card');
    // The card still says the model moves; it just does not play.
    expect(within(card!).getByTestId('project-card-clip-mark')).toBeTruthy();
    fireEvent.pointerEnter(card!);
    expect(within(card!).queryByTestId('project-card-clip')).toBeNull();
  });

  it('explains the empty gallery: what it is, how to publish, and links to /connect', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([]));
    render(<GalleryView />);
    const empty = await screen.findByTestId('gallery-empty');
    expect(empty.textContent).toContain('The gallery shows models');
    expect(empty.textContent).toContain('Publish to gallery');
    expect(within(empty).getAllByRole('listitem')).toHaveLength(3);
    expect(within(empty).getByRole('link', { name: /Connect your agent/ }).getAttribute('href')).toBe('/connect');
    expect(within(empty).getByRole('link', { name: /your projects/i }).getAttribute('href')).toBe('/me');
  });

  it('shows an ErrorState with a working Try again and a way out to Studio', async () => {
    fetchGalleryMock.mockRejectedValueOnce(new Error('HTTP 404'));
    fetchGalleryMock.mockResolvedValueOnce(page([item(1)]));
    render(<GalleryView />);
    // The toast region is an alert too; take the ErrorState's.
    const alert = (await screen.findByText('Could not load the gallery')).closest<HTMLElement>('[role="alert"]')!;
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('HTTP 404');
    expect(within(alert).getByRole('link', { name: 'Open Studio' }).getAttribute('href')).toBe('/studio');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByTestId('gallery-card')).toHaveLength(1);
  });

  it('appends the next page with Load more and hides it on the last page', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([item(1), item(2)], 'cur-2'));
    fetchGalleryMock.mockResolvedValueOnce(page([item(3)], null));
    render(<GalleryView />);
    await screen.findAllByTestId('gallery-card');
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByTestId('gallery-card')).toHaveLength(3));
    expect(fetchGalleryMock).toHaveBeenLastCalledWith('new', 'cur-2', GALLERY_PAGE_SIZE);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('switches sort tabs, refetches from the first page and records the tab in the URL', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([item(1)]));
    fetchGalleryMock.mockResolvedValueOnce(page([item(9, { remixCount: 7 })]));
    render(<GalleryView />);
    await screen.findAllByTestId('gallery-card');

    fireEvent.click(screen.getByRole('tab', { name: 'Most remixed' }));
    await waitFor(() => expect(screen.getByTestId('gallery-card').textContent).toContain('Model 9'));
    expect(fetchGalleryMock).toHaveBeenLastCalledWith('remixed', null, GALLERY_PAGE_SIZE);
    expect(screen.getByRole('tab', { name: 'Most remixed' }).getAttribute('aria-selected')).toBe('true');
    expect(window.location.search).toBe('?sort=remixed');
  });

  it('opens on the tab named in ?sort=', async () => {
    window.history.replaceState(null, '', '/gallery?sort=featured');
    fetchGalleryMock.mockResolvedValueOnce(page([]));
    render(<GalleryView />);
    expect((await screen.findByTestId('gallery-empty')).textContent).toContain('No featured models');
    expect(fetchGalleryMock).toHaveBeenCalledWith('featured', null, GALLERY_PAGE_SIZE);
  });

  it('offers the New tab from an empty Featured tab', async () => {
    window.history.replaceState(null, '', '/gallery?sort=featured');
    fetchGalleryMock.mockResolvedValueOnce(page([]));
    fetchGalleryMock.mockResolvedValueOnce(page([item(4)]));
    render(<GalleryView />);
    fireEvent.click(await screen.findByRole('button', { name: 'See new models' }));
    expect(await screen.findAllByTestId('gallery-card')).toHaveLength(1);
    expect(fetchGalleryMock).toHaveBeenLastCalledWith('new', null, GALLERY_PAGE_SIZE);
    expect(window.location.search).toBe('');
  });

  it('ignores a stale response from a tab the viewer already left', async () => {
    let resolveFirst: (p: GalleryPage) => void = () => {};
    fetchGalleryMock.mockReturnValueOnce(new Promise<GalleryPage>(r => { resolveFirst = r; }));
    fetchGalleryMock.mockResolvedValueOnce(page([item(5)]));
    render(<GalleryView />);
    fireEvent.click(screen.getByRole('tab', { name: 'Featured' }));
    await screen.findAllByTestId('gallery-card');
    resolveFirst(page([item(1), item(2)]));
    await new Promise(r => setTimeout(r, 0));
    const cards = screen.getAllByTestId('gallery-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.textContent).toContain('Model 5');
  });
});
