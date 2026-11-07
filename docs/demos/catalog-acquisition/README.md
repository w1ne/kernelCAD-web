# Catalog acquisition page demo

This bundle records the local static catalog build in the existing Chrome
session. It shows the loaded 3D model, a real preset switch, the generated
download links and the honest agent handoff. It does not show a production
deployment.

## Reproduce

```sh
npm run catalog:site
node docs/demos/catalog-acquisition/serve.mjs site-build 4179
node docs/demos/catalog-acquisition/capture.mjs http://127.0.0.1:4179 /catalog/characters/bear/
ffmpeg -y -framerate 10 -i 'docs/demos/catalog-acquisition/.frames/frame-%04d.jpg' \
  -vf 'scale=1280:-2:flags=lanczos,format=yuv420p' -c:v libx264 -crf 24 \
  -movflags +faststart docs/demos/catalog-acquisition/asset-page-workflow.mp4
```

The capture connects to the already running Chrome CDP endpoint at
`127.0.0.1:9222`, creates a new tab, and closes only that tab. The local static
server binds to loopback and has a 15-minute maximum lifetime plus a 2-minute
idle timeout. The capture checks the page's SEO fields and downloads every
generated file for five assets over HTTP, verifying response status, content
length, attachment filename, SHA-256 and GLB triangle budgets.

## Evidence

- [`downloads.json`](downloads.json): all generated file sizes, SHA-256 hashes,
  GLB triangle counts and budgets.
- [`browser-check.json`](browser-check.json): local browser facts and HTTP
  verification for five assets. STEP rows cite their matching default GLB's
  triangle count because STEP preserves exact CAD geometry.
- [`asset-page-workflow.mp4`](asset-page-workflow.mp4): inspected page workflow.

The page uses build-time preset files. It does not run the CAD kernel in the
browser. The hosted MCP tool list currently has no catalog lookup/fetch tool.
