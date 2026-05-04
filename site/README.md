# kernelcad.com

Single-page marketing site for kernelCAD. Plain HTML + CSS, zero framework.

## Develop

```bash
node site/scripts/build-demo.mjs       # generate demo.mp4 + demo.json into public/
cd site && for f in public/*; do ln -sf "$f" "$(basename "$f")"; done
python3 -m http.server 8000
# open http://localhost:8000
```

The symlinks alias `public/demo.mp4`, `public/demo.json`, `public/favicon.svg` into `site/` root so `python3 -m http.server` resolves the absolute paths the HTML expects (`/demo.mp4`, etc.). On Cloudflare Pages this isn't needed — Pages serves `public/` at the site root automatically. The symlinks are git-ignored.

## Build (run before deploy)

```bash
node site/scripts/build-demo.mjs       # pulls latest demo MP4 from ../docs/demos/v*/
node site/scripts/render-brand.mjs     # renders PNG brand assets
```

## Deploy

Cloudflare Pages, build dir = `site/`, build command = `node site/scripts/build-demo.mjs && node site/scripts/render-brand.mjs`.

Spec: `../docs/superpowers/specs/2026-05-04-kernelcad-website-design.md`
