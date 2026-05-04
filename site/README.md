# kernelcad.com

Single-page marketing site for kernelCAD. Plain HTML + CSS, zero framework.

## Develop

```bash
npx tsx site/scripts/build-demo.ts   # generate demo.mp4 + demo.json into public/
cd site && for f in public/*; do ln -sf "$f" "$(basename "$f")"; done
python3 -m http.server 8000
# open http://localhost:8000
```

The symlinks alias `public/demo.mp4`, `public/demo.json`, `public/favicon.svg` into `site/` root so `python3 -m http.server` resolves the absolute paths the HTML expects (`/demo.mp4`, etc.). On Cloudflare Pages this isn't needed — Pages serves `public/` at the site root automatically. The symlinks are git-ignored.

## Build (run before deploy)

```bash
npx tsx site/scripts/build-demo.ts   # pulls hero demo MP4 for current package.json.version from ../docs/demos/
node site/scripts/render-brand.mjs     # renders PNG brand assets
```

## Deploy

Cloudflare Pages, build dir = `site/`, build command = `npx tsx site/scripts/build-demo.ts && node site/scripts/render-brand.mjs`.

Spec: kernelcad-website-design (in kernelCAD-private)
