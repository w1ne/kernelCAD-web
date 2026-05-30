# kernelcad.com

Single-page marketing site for kernelCAD. Plain HTML + CSS, zero framework.

## Develop

```bash
npm run site:build                  # generate demo, gallery, and brand assets into public/
bash site/scripts/link-public.sh    # link generated assets for python's static server
python3 -m http.server 8000
# open http://localhost:8000
```

The symlinks alias generated `site/public/*` assets into `site/` root so
`python3 -m http.server` resolves the absolute paths the HTML expects
(`/demo.mp4`, `/gallery.json`, `/gallery/<slug>/model.glb`, etc.). On
Cloudflare Pages the deploy workflow copies `site/` into a dereferenced upload
directory. The symlinks are git-ignored.

## Build (run before deploy)

```bash
npm run site:build
```

## Deploy

Cloudflare Pages, build dir = `site/`, build command = `npm run site:build`.
The private GitHub workflow then uploads a dereferenced copy of `site/`.

Spec: kernelcad-website-design (in kernelCAD-private)
