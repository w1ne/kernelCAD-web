# Deployment runbook

Three independent surfaces ship by three different mechanisms. Match the change
you made to the right row — do **not** cut a release tag just to push one surface.

| You changed… | Surface | How it ships |
|---|---|---|
| `src/**` (the Studio app) | **app.kernelcad.com** | **Automatic** on push to `develop` |
| `site/**` (landing + gallery) | **kernelcad.com** | **Manual** dispatch (see below) |
| `workers/feedback-mailer/**` (feedback email) | Worker `kernelcad-feedback-mailer` | **Manual**: `npx -y wrangler@4.94.0 deploy -c workers/feedback-mailer/wrangler.toml` |
| published packages | **npm** | A `v*` **release tag** (full release) |

There is one trunk: **`develop`** (the GitHub default branch). There is no `main`.

## app.kernelcad.com — the Studio

- Workflow: `.github/workflows/deploy-cloudflare.yml` (job `app`).
- Trigger: **push to `develop`** (also `main`, `feat/kernelcad-website`, `v*` tags).
- Build: Vite (`VITE_BASE_PATH=/`) → Cloudflare Pages project `kernelcad-app`.
- **So: merging a PR to `develop` auto-deploys the Studio. No manual step.**

## kernelcad.com — marketing site + gallery

The marketing site source lives here under `site/`. The public
`deploy-marketing.yml` workflow dispatches the deployment workflow in the private
**`kernelCAD-server`** repo: `deploy-kernelcad-com.yml`.

- Trigger: **eligible pushes to `develop`** automatically dispatch the private
  workflow. This includes changes under `site/`, `docs/guide/` (blog sources),
  `docs/demos/` (hero and blog media), and other build inputs. The listed
  top-level prose files (`README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`,
  `RELEASE_NOTES.md`),
  unrelated `docs/`, `doc/` and `archive/` changes alone are excluded.
- Manual `workflow_dispatch` remains available in either repo; the private
  workflow also self-triggers when its own workflow file changes on `main`.
- What it does: checks out `kernelCAD-web` at `web_ref` (default `develop`), runs
  `npm run site:build` (which runs `build-demo` + `build-gallery`), deploys the
  built `site/` to the marketing Cloudflare Pages project, then **attempts to
  purge the kernelcad.com edge cache** (the custom domain caches per-slug assets
  for hours). The purge step can fail while the workflow still reports success;
  inspect its result separately and verify the custom domain after upload.

Only approved posts should be marked published. Normal builds omit drafts;
changing the deployment trigger does not approve a draft for publication.

To manually redeploy the current `develop` to kernelcad.com:

```bash
# optional override after the change is merged to develop
gh workflow run deploy-kernelcad-com.yml -R w1ne/kernelCAD-server -f web_ref=develop
# watch it:
gh run watch -R w1ne/kernelCAD-server "$(gh run list -R w1ne/kernelCAD-server -w deploy-kernelcad-com.yml -L1 --json databaseId --jq '.[0].databaseId')"
```

`web_ref` accepts any ref (branch/tag/sha) if you need to deploy something other
than `develop`. Operator-side detail (Pages project name, secrets) is documented
in `kernelCAD-server/docs/deploy-*.md` and kept private on purpose.

Verify the actual private deploy's checked-out web commit and upload result,
then its cache-purge step and the live custom domain. A successful dispatch in
this repo does not prove the private deploy finished. Edge cache can lag if
the purge is skipped or fails, including HTTP 401 authentication failures.

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
- **Changed marketing build inputs (`site/`, `docs/guide/`, `docs/demos/`)** → merge to `develop`; the private marketing deploy is dispatched automatically. Check that deploy and the live URLs; use manual dispatch when a redeploy is needed.
- **Want to release packages** → cut a `v*` tag (mind Demo discipline for `v0.X.0`).
