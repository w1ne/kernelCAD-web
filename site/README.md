# kernelcad.com

Single-page marketing site for kernelCAD. Plain HTML + CSS, zero framework.

## Develop

```bash
cd site && python3 -m http.server 8000
# open http://localhost:8000
```

## Build (run before deploy)

```bash
node site/scripts/build-demo.mjs       # pulls latest demo MP4 from ../docs/demos/v*/
node site/scripts/render-brand.mjs     # renders PNG brand assets
```

## Deploy

Cloudflare Pages, build dir = `site/`, build command = `node site/scripts/build-demo.mjs && node site/scripts/render-brand.mjs`.

Spec: `../docs/superpowers/specs/2026-05-04-kernelcad-website-design.md`
