import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('static gallery landing page', () => {
  it('copies MCP client install one-liners instead of the raw server command', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain('claude mcp add kernelcad -- npx -y kernelcad mcp');
    expect(html).toContain('codex mcp add kernelcad -- npx -y kernelcad mcp');
    expect(html).not.toContain("wireCopyButton('mcp-btn', 'kernelcad mcp')");
  });

  it('places the prompt handoff before the built-with-kernelCAD gallery', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain('action="https://app.kernelcad.com/generate"');
    expect(html).toContain('name="prompt"');
    expect(html).toContain('Describe the part you want');

    const promptIdx = html.indexOf('class="prompt-handoff"');
    const galleryIdx = html.indexOf('class="gallery"');
    expect(promptIdx).toBeGreaterThan(-1);
    expect(galleryIdx).toBeGreaterThan(promptIdx);
  });

  it('renders gallery tiles with rotating model-viewer elements', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain('<model-viewer');
    expect(html).toContain('auto-rotate');
    expect(html).toContain('rotation-per-second="20deg"');
    expect(html).toContain('src="${cacheKeyedUrl(entry.modelUrl, galleryCacheKey)}"');
    expect(html).toContain('poster="${cacheKeyedUrl(entry.posterUrl, galleryCacheKey)}"');
    expect(html).toContain('fetch(`/gallery.json?v=${Date.now()}`, { cache: ');
    expect(html).toContain('cacheKeyedUrl(entry.modelUrl, galleryCacheKey)');
    expect(html).toContain('cacheKeyedUrl(entry.videoUrl, galleryCacheKey)');
    expect(html).toContain('entry.promptUrl');
    expect(html).toContain('Text-to-CAD prompt');
    expect(html).toContain('<video class="lightbox-video" autoplay muted loop playsinline controls>');

    const css = readFileSync(path.resolve(__dirname, '../site/style.css'), 'utf8');
    expect(css).toMatch(/\.gallery-tile \.tile-viewer[\s\S]*pointer-events:\s*none/);
    expect(css).toContain('.lightbox-prompt-label');
  });

  it('keeps the royal watch gallery model rotating on the dial side', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain("entry.slug === 'royal-pop-pocket-watch'");
    expect(html).toContain('min-camera-orbit="${orbit.min}"');
    expect(html).toContain('max-camera-orbit="${orbit.max}"');
    expect(html).toContain('camera-orbit="${orbit.initial}"');
  });
});
