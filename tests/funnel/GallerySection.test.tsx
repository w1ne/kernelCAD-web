// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { GallerySection, type GalleryEntry } from '../../src/funnel/components/GallerySection';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

afterEach(() => cleanup());

const entry: GalleryEntry = {
  slug: 'widget',
  title: 'Widget',
  author: { handle: 'ada', url: 'https://example.com/ada' },
  version: 'v1.2.3',
  prompt: 'make a widget',
  source: 'src/widget.kcad.ts',
  code: 'https://example.com/code',
  tags: ['demo'],
  featured: false,
  createdAt: '2026-01-02',
  appUrl: 'https://example.com/app',
  videoUrl: '/widget.mp4',
  posterUrl: '/widget.png',
  modelUrl: '/widget.glb',
};

function stubGallery(payload: unknown): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('GallerySection characterisation', () => {
  it('renders nothing when the gallery fetch fails', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const { container } = render(<GallerySection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/gallery.json'));
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders nothing when the gallery has no entries', async () => {
    const fetchMock = stubGallery({ generatedAt: 'x', entries: [] });
    const { container } = render(<GallerySection />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/gallery.json'));
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders the section header and one poster tile per entry', async () => {
    stubGallery({ generatedAt: 'x', entries: [entry] });
    render(<GallerySection />);

    expect(await screen.findByText('Built with kernelCAD')).toBeInTheDocument();
    expect(screen.getByText('Every release ships with a build. Click any to see the prompt that built it.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Submit your build →' })).toHaveAttribute(
      'href',
      'https://github.com/w1ne/kernelCAD-web/issues/new?template=gallery-submission.md',
    );

    const tile = screen.getByRole('button', { name: 'Open Widget' });
    expect(tile.querySelector('img')).toHaveAttribute('src', '/widget.png');
  });

  it('opens the detail dialog with prompt, author, version and links, and closes it again', async () => {
    stubGallery({ generatedAt: 'x', entries: [entry] });
    const { container } = render(<GallerySection />);

    const tile = await screen.findByRole('button', { name: 'Open Widget' });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    expect(dialog).toBeInTheDocument();
    expect(dialog.open).toBe(false);

    fireEvent.click(tile);
    await waitFor(() => expect(dialog.open).toBe(true));
    expect(screen.getByText('make a widget')).toBeInTheDocument();
    expect(screen.getByText('@ada')).toHaveAttribute('href', 'https://example.com/ada');
    expect(screen.getByText(/v1\.2\.3/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-02/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View source ↗' })).toHaveAttribute('href', 'https://example.com/code');
    expect(screen.getByRole('link', { name: 'Open in app ↗' })).toHaveAttribute('href', 'https://example.com/app');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(screen.queryByText('make a widget')).toBeNull();
  });

  it('closes the dialog when the backdrop (dialog element itself) is clicked', async () => {
    stubGallery({ generatedAt: 'x', entries: [entry] });
    const { container } = render(<GallerySection />);

    const tile = await screen.findByRole('button', { name: 'Open Widget' });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    fireEvent.click(tile);
    await waitFor(() => expect(dialog.open).toBe(true));

    fireEvent.click(dialog);
    await waitFor(() => expect(dialog.open).toBe(false));
    expect(screen.queryByText('make a widget')).toBeNull();
  });

  it('omits the "Open in app" link when the entry has no appUrl', async () => {
    stubGallery({ generatedAt: 'x', entries: [{ ...entry, appUrl: null }] });
    render(<GallerySection />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open Widget' }));
    expect(await screen.findByText('make a widget')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open in app ↗' })).toBeNull();
  });
});
