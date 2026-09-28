// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

beforeEach(() => {
  fetchGalleryMock.mockReset();
  window.history.replaceState(null, '', '/gallery');
});
afterEach(cleanup);

describe('GalleryView', () => {
  it('shows a loading state, then cards with title, author, remix count and render', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([
      item(1, { ownerName: 'Alice', remixCount: 3, featured: true }),
      item(2, { renderUrl: null, remixCount: 1, forkedFrom: { slug: 'slug-1', title: 'Model 1' } }),
    ]));
    render(<GalleryView />);
    expect(screen.getByRole('status').textContent).toBe('Loading…');

    const cards = await screen.findAllByTestId('gallery-card');
    expect(cards).toHaveLength(2);
    expect(fetchGalleryMock).toHaveBeenCalledWith('new', null, GALLERY_PAGE_SIZE);
    expect(cards[0]!.getAttribute('href')).toBe('/p/slug-1');
    expect(cards[0]!.textContent).toContain('by Alice');
    expect(cards[0]!.textContent).toContain('3 remixes');
    expect(cards[0]!.textContent).toContain('Featured');
    expect(cards[0]!.querySelector('img')!.getAttribute('src')).toBe('https://cdn.test/1.png');
    expect(cards[1]!.textContent).toContain('by anonymous');
    expect(cards[1]!.textContent).toContain('1 remix');
    expect(cards[1]!.textContent).toContain('No preview');
    expect(cards[1]!.textContent).toContain('Remix of Model 1');
  });

  it('shows the empty state', async () => {
    fetchGalleryMock.mockResolvedValueOnce(page([]));
    render(<GalleryView />);
    expect((await screen.findByTestId('gallery-empty')).textContent).toContain('Publish to gallery');
  });

  it('shows an error with a working Retry', async () => {
    fetchGalleryMock.mockRejectedValueOnce(new Error('boom'));
    fetchGalleryMock.mockResolvedValueOnce(page([item(1)]));
    render(<GalleryView />);
    expect((await screen.findByRole('alert')).textContent).toContain('Could not load the gallery');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
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
