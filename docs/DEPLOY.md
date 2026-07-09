# Deployment runbook

Three independent surfaces ship by three different mechanisms. Match the change
you made to the right row — do **not** cut a release tag just to push one surface.

| You changed… | Surface | How it ships |
|---|---|---|
| `src/**` (the Studio app) | **app.kernelcad.com** | **Automatic** on push to `develop` |
| `site/**` (landing + gallery) | **kernelcad.com** | **Manual** dispatch (see below) |
| published packages | **npm** | A `v*` **release tag** (full release) |

There is one trunk: **`develop`** (the GitHub default branch). There is no `main`.

## app.kernelcad.com — the Studio

- Workflow: `.github/workflows/deploy-cloudflare.yml` (job `app`).
- Trigger: **push to `develop`** (also `main`, `feat/kernelcad-website`, `v*` tags).
- Build: `npm run build` (Vite, `VITE_BASE_PATH=/`) → Cloudflare Pages project `kernelcad-app`.
- **So: merging a PR to `develop` auto-deploys the Studio. No manual step.**

## kernelcad.com — marketing site + gallery

The marketing site source lives here under `site/`, but it is **not deployed from
this repo**. It is deployed by a manual operator workflow in the private
**`kernelCAD-server`** repo: `deploy-kernelcad-com.yml`.

- Trigger: **`workflow_dispatch` only** (plus a self-trigger when that workflow
  file itself changes). Content changes under `site/` do **not** auto-deploy.
- What it does: checks out `kernelCAD-web` at `web_ref` (default `develop`), runs
  `npm run site:build` (which runs `build-demo` + `build-gallery`), deploys the
  built `site/` to the marketing Cloudflare Pages project, then **purges the
  kernelcad.com edge cache** (the custom domain caches per-slug assets for hours).

To deploy the current `develop` to kernelcad.com:

```bash
# after your site/ change is merged to develop
gh workflow run deploy-kernelcad-com.yml -R w1ne/kernelCAD-server -f web_ref=develop
# watch it:
gh run watch -R w1ne/kernelCAD-server "$(gh run list -R w1ne/kernelCAD-server -w deploy-kernelcad-com.yml -L1 --json databaseId --jq '.[0].databaseId')"
```

`web_ref` accepts any ref (branch/tag/sha) if you need to deploy something other
than `develop`. Operator-side detail (Pages project name, secrets) is documented
in `kernelCAD-server/docs/deploy-*.md` and kept private on purpose.

Verify after deploy (edge cache can lag if the purge step is skipped):

```bash
curl -s https://kernelcad.com/gallery.json | jq -r '.generatedAt'   # should be recent
curl -s https://kernelcad.com/ | grep -o '<h1 class="headline">[^<]*'
```

## npm — a release tag

A `v*` tag is a **full release**, not a single-surface deploy. Pushing it fires
**all** of: `publish-npm.yml` (publishes packages to npm), `dist-skills.yml`,
`deploy.yml` (GitHub Pages), and `deploy-cloudflare.yml`. Per the **Demo
discipline** rule in `CLAUDE.md`, a `v0.X.0` minor tag also requires
`docs/demos/v0.X/<task>/whats-new.md` + `meta.json`.

Only tag when you intend an actual release. To ship the Studio or the marketing
site without releasing packages, use the per-surface paths above.

## Quick answers

- **Changed the Studio (`src/`)** → merge to `develop`; it auto-deploys to app.kernelcad.com.
- **Changed the landing/gallery (`site/`)** → merge to `develop`, then `gh workflow run deploy-kernelcad-com.yml -R w1ne/kernelCAD-server -f web_ref=develop`.
- **Want to release packages** → cut a `v*` tag (mind Demo discipline for `v0.X.0`).
