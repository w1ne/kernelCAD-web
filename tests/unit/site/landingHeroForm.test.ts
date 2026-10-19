// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The landing hero is static HTML: a plain GET form to the app's /generate
// page, three example links, and one agent-connect line. It must work with
// JavaScript off, so the checks read the markup, not the page script.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '../../..');
const HTML = readFileSync(path.join(ROOT, 'site/index.html'), 'utf8');
const doc = new JSDOM(HTML).window.document;
const hero = doc.querySelector('header.hero')!;
const APP = 'https://app.kernelcad.com';

type Entry = { slug: string; source: string; appUrl: string | null };
const ENTRIES: Entry[] = JSON.parse(
  readFileSync(path.join(ROOT, 'site/gallery/entries.json'), 'utf8'),
).entries;

/** What build-gallery.ts puts in `studioUrl`, the link the gallery cards use. */
function expectedUrl(e: Entry): string {
  return e.source === 'curated' ? `${APP}/studio?gallery=${encodeURIComponent(e.slug)}` : e.appUrl!;
}

describe('landing hero prompt form', () => {
  const form = hero.querySelector<HTMLFormElement>('form.hero-form')!;

  it('is a plain GET form to the app generate page with auto=1', () => {
    expect(form).not.toBeNull();
    expect(form.getAttribute('method')).toBe('get');
    expect(form.getAttribute('action')).toBe(`${APP}/generate`);
    expect(form.querySelector('input[type="hidden"][name="auto"]')!.getAttribute('value')).toBe('1');
  });

  it('has a labelled, required text input named q with a length cap', () => {
    const input = form.querySelector<HTMLInputElement>('input[name="q"]')!;
    expect(input.type).toBe('text');
    expect(input.required).toBe(true);
    expect(Number(input.getAttribute('maxlength'))).toBeGreaterThan(0);
    expect(Number(input.getAttribute('maxlength'))).toBeLessThanOrEqual(2000);
    const label = form.querySelector(`label[for="${input.id}"]`);
    expect(label?.textContent?.trim()).toBeTruthy();
  });

  it('has a Build submit button', () => {
    const btn = form.querySelector('button[type="submit"]')!;
    expect(btn.textContent?.trim()).toBe('Build');
  });
});

describe('landing hero example chips', () => {
  const chips = [...hero.querySelectorAll<HTMLAnchorElement>('.hero-examples a')];

  it('has three links', () => {
    expect(chips).toHaveLength(3);
  });

  it('each points at a gallery entry in entries.json', () => {
    const wanted = new Set(ENTRIES.map(expectedUrl));
    for (const chip of chips) {
      expect(wanted.has(chip.getAttribute('href')!), chip.getAttribute('href')!).toBe(true);
      expect(chip.textContent!.trim().length).toBeGreaterThan(0);
    }
    expect(new Set(chips.map((c) => c.getAttribute('href'))).size).toBe(3);
  });
});

describe('landing hero agent line', () => {
  it('replaces the command rows with one connect link', () => {
    const link = [...hero.querySelectorAll<HTMLAnchorElement>('a')].find((a) => /Connect your agent/.test(a.textContent!))!;
    expect(link.getAttribute('href')).toBe(`${APP}/connect`);
    expect(hero.textContent).toContain('Already use ChatGPT, Claude, Claude Code, Codex, Cursor, VS Code, Gemini CLI or Grok?');
  });

  it('drops the modes row, install commands, copy buttons and their script', () => {
    expect(hero.querySelector('.modes, .install, .install-stack, .copy')).toBeNull();
    expect(hero.textContent).not.toContain('npm install');
    expect(hero.textContent).not.toContain('Try in browser');
    expect(HTML).not.toContain('wireCopyButton');
    expect(HTML).not.toContain('claude mcp add');
  });

  it('keeps a quiet GitHub star link', () => {
    const star = [...hero.querySelectorAll<HTMLAnchorElement>('a')].find((a) => /Star on GitHub/.test(a.textContent!))!;
    expect(star.getAttribute('href')).toBe('https://github.com/w1ne/kernelCAD-web');
  });

  it('step 1 no longer says "with one command"', () => {
    expect(doc.querySelector('.steps-list')!.textContent).not.toContain('one command');
  });
});

describe('landing css', () => {
  it('has no rules left for the removed hero parts', () => {
    const css = readFileSync(path.join(ROOT, 'site/style.css'), 'utf8');
    expect(css).not.toMatch(/\.modes\b|\.install\b|\.install-/);
  });
});
