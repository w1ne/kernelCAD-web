import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('static gallery landing page', () => {
  it('copies MCP client install one-liners instead of the raw server command', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain('claude mcp add --transport http kernelcad https://mcp.kernelcad.com/mcp');
    expect(html).toContain('codex mcp add kernelcad -- npx -y kernelcad mcp');
    expect(html).not.toContain("wireCopyButton('mcp-btn', 'kernelcad mcp')");
  });

  it('exposes Claude Desktop on the supported-surfaces row and install stack', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    // Chip lives inside the supported-surfaces row.
    const modesStart = html.indexOf('aria-label="Supported agent surfaces"');
    expect(modesStart).toBeGreaterThan(-1);
    const modesEnd = html.indexOf('</div>', modesStart);
    expect(modesEnd).toBeGreaterThan(modesStart);
    const modesBlock = html.slice(modesStart, modesEnd);
    expect(modesBlock).toContain('Claude Desktop');

    // Claude Desktop chip is ordered FIRST (most consumer-facing).
    const claudeDesktopIdx = modesBlock.indexOf('Claude Desktop');
    const codexIdx = modesBlock.indexOf('Codex');
    const claudeCodeIdx = modesBlock.indexOf('Claude Code');
    const cursorIdx = modesBlock.indexOf('Cursor');
    const cliChipIdx = modesBlock.indexOf('>CLI<');
    expect(claudeDesktopIdx).toBeGreaterThan(-1);
    expect(claudeDesktopIdx).toBeLessThan(codexIdx);
    expect(claudeDesktopIdx).toBeLessThan(claudeCodeIdx);
    expect(claudeDesktopIdx).toBeLessThan(cursorIdx);
    expect(claudeDesktopIdx).toBeLessThan(cliChipIdx);

    // Fourth install card: anchor (not a copy-button) that links to /app/connect.
    const stackStart = html.indexOf('aria-label="Install commands"');
    expect(stackStart).toBeGreaterThan(-1);
    const stackEnd = html.indexOf('</div>', stackStart);
    const stackBlock = html.slice(stackStart, stackEnd);
    expect(stackBlock).toContain('id="claude-desktop-link"');
    expect(stackBlock).toContain('href="/app/connect"');
    expect(stackBlock).toContain('Connect your agent');

    // Caption sits near the install stack and states the real monetization
    // model: bring-your-own-Claude is free + unlimited; the built-in hosted
    // agent (generation) is the paid path.
    expect(html).toContain('id="claude-desktop-note"');
    expect(html).toContain('free and unlimited');
    expect(html).toContain('built-in hosted agent (paid)');
  });

  it('documents the same full marketing build command used by deploy', () => {
    const readme = readFileSync(path.resolve(__dirname, '../site/README.md'), 'utf8');

    expect(readme).toContain('npm run site:build');
    expect(readme).not.toContain('build-demo.ts && node site/scripts/render-brand.mjs');
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

  it('renders gallery tiles as posters before upgrading them to rotating model-viewer elements', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');
    const redirects = readFileSync(path.resolve(__dirname, '../site/_redirects'), 'utf8');

    expect(html).toContain('function upgradeGalleryTile(tile, entry, galleryCacheKey)');
    expect(html).toContain('auto-rotate');
    expect(html).toContain("viewer.setAttribute('rotation-per-second', '20deg')");
    expect(html).toContain("viewer.setAttribute('src', cacheKeyedUrl(entry.modelUrl, galleryCacheKey))");
    expect(html).toContain("viewer.setAttribute('poster', cacheKeyedUrl(entry.posterUrl, galleryCacheKey))");
    expect(html).toContain('function upgradeGalleryTilesNearViewport(grid, galleryCacheKey)');
    expect(html).toContain("tile.addEventListener('pointerenter'");
    expect(html).toContain("tile.addEventListener('focus'");
    const renderLoop = html.slice(html.indexOf('for (const entry of g.entries)'), html.indexOf('grid.appendChild(tile);'));
    expect(renderLoop).toContain('class="tile-poster"');
    expect(renderLoop).toContain('class="tile-studio-link"');
    expect(renderLoop).toContain('href="${entry.studioUrl}"');
    expect(renderLoop).toContain('Open in Studio');
    expect(renderLoop).not.toContain('<model-viewer');
    expect(renderLoop).not.toContain('cacheKeyedUrl(entry.modelUrl, galleryCacheKey)');
    expect(html).toContain("fetch('/gallery.json')");
    expect(html).toContain('function loadModelViewerNearGallery(section)');
    expect(html).toContain("import('https://cdn.jsdelivr.net/npm/@google/model-viewer/dist/model-viewer.min.js')");
    expect(html).toContain('cacheKeyedUrl(entry.modelUrl, galleryCacheKey)');
    expect(html).not.toContain('cacheKeyedUrl(entry.videoUrl, galleryCacheKey)');
    expect(html).not.toContain('class="lightbox-video"');
    expect(html).toContain('entry.promptUrl');
    expect(html).toContain('Build brief');
    expect(html).toContain('<div class="lightbox-stage"></div>');
    expect(html).toContain('function mountLightboxModel(entry, galleryCacheKey)');
    expect(html).toContain("viewer.setAttribute('src', cacheKeyedUrl(entry.modelUrl, galleryCacheKey))");
    expect(html).toContain('class="lightbox-studio-link"');
    expect(html).toContain('Free projects are public by link');
    expect(redirects).toContain('/demo-poster.png /public/demo-poster.png 200');
    expect(redirects).toContain('/gallery.json  /public/gallery.json   200');
    expect(redirects).toContain('/gallery/*     /public/gallery/:splat 200');

    const css = readFileSync(path.resolve(__dirname, '../site/style.css'), 'utf8');
    expect(css).toMatch(/\.gallery-tile \.tile-viewer[\s\S]*pointer-events:\s*none/);
    expect(css).toContain('.lightbox-prompt-label');
  });

  it('keeps the React funnel gallery from loading model-viewer on section mount', () => {
    const source = readFileSync(
      path.resolve(__dirname, '../src/funnel/components/GallerySection.tsx'),
      'utf8',
    );
    const gallerySectionSetup = source.slice(
      source.indexOf('export function GallerySection()'),
      source.indexOf('if (!entries || entries.length === 0) return null;'),
    );

    expect(gallerySectionSetup).not.toContain('useModelViewer();');
    expect(source).toContain('function GalleryTile');
    expect(source).toContain('IntersectionObserver');
    expect(source).toContain('onPointerEnter');
    expect(source).toContain('onFocus');
  });

  it('keeps the royal watch gallery tile face-forward while allowing model-viewer upgrade', () => {
    const html = readFileSync(path.resolve(__dirname, '../site/index.html'), 'utf8');

    expect(html).toContain("entry.slug === 'royal-pop-pocket-watch'");
    expect(html).toContain('class="tile-poster"');
    expect(html).toContain("initial: '0deg 158deg auto'");
    expect(html).toContain("min: '-16deg 158deg auto'");
    expect(html).toContain("max: '16deg 158deg auto'");
    expect(html).toContain('function animateRoyalWatchFace(viewer)');
    expect(html).toContain('Math.sin(now / 1200) * 14');
    expect(html).toContain('`${theta.toFixed(2)}deg 158deg auto`');
    expect(html).toContain("if (!orbit.faceForward)");
    expect(html).toContain('if (orbit.faceForward) animateRoyalWatchFace(viewer)');
    expect(html).toContain('mountLightboxModel(entry, galleryCacheKey)');
    expect(html).toContain("viewer.setAttribute('min-camera-orbit', orbit.min)");
    expect(html).toContain("viewer.setAttribute('max-camera-orbit', orbit.max)");
    expect(html).toContain("viewer.setAttribute('camera-orbit', orbit.initial)");
    expect(html).not.toContain("if (entry.slug === 'royal-pop-pocket-watch') return;");
    expect(html).not.toContain("tile.__entry?.slug !== 'royal-pop-pocket-watch'");
  });
});
