// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Runs the landing page's own inline script in jsdom: the hero embed swap and
// the gallery rendering (community cards, curated fallback, empty state).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const HTML = readFileSync(path.resolve(__dirname, '../../../site/index.html'), 'utf8');
const APP = 'https://app.kernelcad.com';

type GalleryJson = { generatedAt: string; entries: unknown[]; community?: unknown[] } | null;

function curatedEntry(slug: string, title: string) {
  return {
    slug,
    title,
    author: { handle: 'kernelcad' },
    version: 'v0.11.0',
    featured: false,
    prompt: 'p',
    createdAt: '2026-05-01',
    code: 'https://github.com/w1ne/kernelCAD-web',
    posterUrl: `/gallery/${slug}/poster.jpg`,
    modelUrl: `/gallery/${slug}/model.glb`,
    promptUrl: `/gallery/${slug}/prompt.md`,
    studioUrl: `${APP}/studio?gallery=${slug}`,
    appUrl: null,
  };
}

async function loadLanding(gallery: GalleryJson) {
  const dom = new JSDOM(HTML, {
    url: 'https://kernelcad.com/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(window) {
      const w = window as unknown as Record<string, unknown>;
      w.fetch = async (url: string) => {
        if (url === '/gallery.json') {
          if (gallery === null) return { ok: false, json: async () => null };
          return { ok: true, json: async () => gallery };
        }
        return { ok: false, text: async () => '', json: async () => null };
      };
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    },
  });
  // Let the gallery fetch chain settle.
  for (let i = 0; i < 5; i += 1) await new Promise((r) => setTimeout(r, 0));
  return dom.window;
}

describe('landing hero model', () => {
  it('loads the pinned embed after the page and shows it only when the embed reports the model displayed', async () => {
    const window = await loadLanding({ generatedAt: 'g', entries: [] });
    const doc = window.document;
    const figure = doc.getElementById('hero-model')!;
    const iframe = figure.querySelector('iframe')!;
    const poster = figure.querySelector<HTMLImageElement>('.hero-model-poster')!;

    // The poster paints first and is a same-origin asset.
    expect(poster.getAttribute('src')).toBe('/hero-stool-light.jpg');
    expect(poster.getAttribute('alt')).toMatch(/stool/i);

    window.dispatchEvent(new window.Event('load'));
    await new Promise((r) => setTimeout(r, 350));
    expect(iframe.src).toBe(`${APP}/embed/vEuEM4C5?revision=1`);
    expect(figure.classList.contains('is-live')).toBe(false);

    // A message from another origin never reveals the frame.
    window.dispatchEvent(new window.MessageEvent('message', {
      origin: 'https://evil.example',
      source: iframe.contentWindow,
      data: { type: 'kernelcad.viewer-status', status: 'model_displayed' },
    }));
    expect(figure.classList.contains('is-live')).toBe(false);

    // An embed error keeps the poster.
    window.dispatchEvent(new window.MessageEvent('message', {
      origin: APP,
      source: iframe.contentWindow,
      data: { type: 'kernelcad.viewer-status', status: 'error' },
    }));
    expect(figure.classList.contains('is-live')).toBe(false);
    expect(iframe.getAttribute('aria-hidden')).toBe('true');

    window.dispatchEvent(new window.MessageEvent('message', {
      origin: APP,
      source: iframe.contentWindow,
      data: { type: 'kernelcad.viewer-status', status: 'model_displayed' },
    }));
    expect(figure.classList.contains('is-live')).toBe(true);
    expect(iframe.hasAttribute('aria-hidden')).toBe(false);
    expect(doc.querySelector('.hero-model-open')?.getAttribute('href')).toBe(`${APP}/p/vEuEM4C5`);
  });
});

describe('landing gallery', () => {
  it('renders community models from the API as uniform link cards, with titles as text', async () => {
    const window = await loadLanding({
      generatedAt: 'g',
      entries: [curatedEntry('rocket-keychain', 'Rocket Keychain')],
      community: [
        { slug: 'abc123', title: '<img src=x onerror=alert(1)>', ownerName: null, remixCount: 3, featured: true, posterUrl: '/gallery/_community/abc123.png', url: `${APP}/p/abc123` },
        { slug: 'def456', title: 'Gear stage', ownerName: 'Ada', remixCount: 1, featured: false, posterUrl: '/gallery/_community/def456.webp', url: `${APP}/p/def456` },
      ],
    });
    const doc = window.document;
    const grid = doc.getElementById('gallery-grid')!;
    const cards = Array.from(grid.querySelectorAll('.gallery-card'));

    expect(doc.getElementById('gallery')!.hidden).toBe(false);
    expect(grid.hasAttribute('aria-busy')).toBe(false);
    // Community cards replace the curated fallback entirely.
    expect(cards).toHaveLength(2);
    expect(grid.querySelector('.gallery-tile')).toBeNull();

    const [first, second] = cards;
    const link = first.querySelector('a.card-action')!;
    expect(link.getAttribute('href')).toBe(`${APP}/p/abc123`);
    expect(first.querySelector('.card-title')!.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(first.querySelector('.card-media img[src="x"]')).toBeNull();
    expect(first.querySelector('.card-media img')!.getAttribute('src')).toBe('/gallery/_community/abc123.png?v=g');
    expect(first.querySelector('.card-meta')!.textContent).toBe('by anonymous · 3 remixes');
    expect(first.querySelector('.card-badge')!.textContent).toBe('Featured');
    expect(second.querySelector('.card-meta')!.textContent).toBe('by Ada · 1 remix');

    // Nothing sits on top of the image: no overlay buttons or chips.
    expect(grid.querySelector('.tile-studio-link, .tile-chip')).toBeNull();
    expect(grid.querySelectorAll('.card-media > :not(img)')).toHaveLength(0);
  });

  it('falls back to the curated release builds when the API list is empty', async () => {
    const window = await loadLanding({
      generatedAt: 'g',
      entries: [curatedEntry('rocket-keychain', 'Rocket Keychain'), curatedEntry('royal-pop-pocket-watch', 'Royal Pop')],
      community: [],
    });
    const doc = window.document;
    const tiles = Array.from(doc.querySelectorAll<HTMLButtonElement>('#gallery-grid .gallery-tile'));

    expect(tiles).toHaveLength(2);
    expect(tiles[0].tagName).toBe('BUTTON');
    expect(tiles[0].getAttribute('aria-haspopup')).toBe('dialog');
    expect(tiles[0].querySelector('.card-title')!.textContent).toBe('Rocket Keychain');
    expect(tiles[0].querySelector('.card-meta')!.textContent).toBe('by @kernelcad · v0.11.0');
    // A loading stage, not a mixed-background video frame, until the model renders.
    expect(tiles[0].querySelector('.card-media')!.classList.contains('is-loading')).toBe(true);
    expect(doc.getElementById('gallery-sub')!.textContent).toMatch(/Every release ships with a build/);
    expect(doc.querySelector('.tile-studio-link')).toBeNull();
  });

  it('hides the section when there is nothing to show or gallery.json fails', async () => {
    const empty = await loadLanding({ generatedAt: 'g', entries: [], community: [] });
    expect(empty.document.getElementById('gallery')!.hidden).toBe(true);

    const failed = await loadLanding(null);
    expect(failed.document.getElementById('gallery')!.hidden).toBe(true);
  });
});

describe('landing footer signup', () => {
  it('is a single-line form in the footer that keeps the ?ref attribution and the #signup anchor', () => {
    const dom = new JSDOM(HTML);
    const doc = dom.window.document;
    const form = doc.querySelector('footer.footer form#signup')!;
    expect(form).not.toBeNull();
    expect(form.getAttribute('action')).toBe('/api/subscribe');
    expect(form.querySelector('input#source-input[name="source"]')).not.toBeNull();
    expect(form.querySelector('label[for="signup-email"]')).not.toBeNull();
    // The old body section and its headline are gone.
    expect(doc.body.textContent).not.toContain('Get notified when we ship');
    expect(doc.querySelectorAll('form[action="/api/subscribe"]')).toHaveLength(1);
  });

  it('offers returning visitors their projects and the Studio', () => {
    const doc = new JSDOM(HTML).window.document;
    const hrefs = Array.from(doc.querySelectorAll('.returning a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual([`${APP}/me`, APP]);
  });

  it('has a three-step band: connect, describe, download or print', () => {
    const doc = new JSDOM(HTML).window.document;
    const titles = Array.from(doc.querySelectorAll('.steps-list .step-title')).map((h) => h.textContent);
    expect(titles).toEqual(['Connect your agent', 'Describe the part', 'Download or print']);
    // The headline declares its language so the browser never splits it badly.
    expect(doc.querySelector('h1.headline')!.getAttribute('lang')).toBe('en');
  });
});
