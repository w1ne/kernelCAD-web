// SPDX-License-Identifier: MIT
import { describe, expect, it } from 'vitest';
import { docsPagePayloadBytes } from './verify-docs-bundle';
import { renderDocsSite } from './build-docs';

const sizes = { html: 90_000, styles: 8_000, viewer: 136_000, model: 20_000 };

describe('docs payload budget', () => {
  it('counts static search pages without a viewer they never request', async () => {
    const pages = await renderDocsSite();
    for (const file of ['docs/mcp-tools.html', 'docs/design-guide.html']) {
      expect(docsPagePayloadBytes(pages.find(page => page.file === file)!.html, sizes)).toBe(98_000);
    }
  });

  it('counts the eager viewer and referenced model for runnable pages', () => {
    const html = `<div data-docs-model="model"></div><script>import('/docs-island.js')</script>`;
    expect(docsPagePayloadBytes(html, sizes)).toBe(254_000);
    expect(docsPagePayloadBytes(`<script src="/docs-island.js"></script>`, sizes)).toBe(234_000);
  });
});
