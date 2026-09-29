// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('marketing landing cache behaviour', () => {
  it('the hero shows the live model embed, not the demo video', () => {
    const html = readFileSync('site/index.html', 'utf8');

    // The hero is the app's /embed viewer over a same-origin poster (S14).
    expect(html).toContain('id="hero-model"');
    expect(html).not.toContain("fetch('/demo.json')");
    expect(html).not.toContain('/demo.mp4');
    expect(html).not.toContain('polished-brass-tube.step');
  });

  it('keeps landing metadata fetches cacheable', () => {
    const html = readFileSync('site/index.html', 'utf8');

    expect(html).toContain("fetch('/gallery.json')");
    expect(html).toContain('fetch(entry.promptUrl)');
    expect(html).not.toContain('Date.now()');
    expect(html).not.toContain("cache: 'no-store'");
    expect(html).not.toContain('cache: "no-store"');
    expect(html).not.toContain('fetch(cacheKeyedUrl(entry.promptUrl');
  });
});
