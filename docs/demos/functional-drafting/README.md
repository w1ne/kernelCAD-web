# Functional drafting workflow evidence

Two actual local Studio workflows and two native articles. `plate/` demonstrates covered → hidden critical → ordinary incomplete PDF → restored/refreshed/reviewed strict PDF. `bearing/` demonstrates unresolved → decision draft → record → refresh → mark reviewed → strict PDF. The PNG stages and MP4 frames come from real Chrome screenshots. `receipt.json` retains stages, source SHA-256, actual HTTP status/options/reports and downloaded PDF hashes. No mocked response, fabricated report or cloud project mutation is used.

Reproduce from the source checkout with installed dependencies and Node 22. Start a bounded owned Vite server with `VITE_API_BASE_URL= VITE_KERNELCAD_API_BASE= npm run dev -- --host 127.0.0.1 --port 5248 --strictPort`. Inspect the existing browser first. `CDP_URL` defaults to the already running Chrome at `http://127.0.0.1:9444`; helpers create only an owned tab in its current profile and have no browser-launch fallback. Every CDP command has a ten-second idle timeout and each capture has a four-minute workflow deadline. Timeout, SIGINT/SIGTERM and recorder failure stop further actions, restore the temporary project, persist the failed receipt, then close only the owned tab. Each finalization action has a thirty-second cleanup bound. Partial CDP attachments dispose their owned target and socket. `BASE_URL`, `BACKEND_SHA` and `OUTPUT` permit the same helper to be used for a later separately verified deployment.

```bash
node docs/demos/functional-drafting/capture.mjs plate
node docs/demos/functional-drafting/encode.mjs plate
node docs/demos/functional-drafting/capture.mjs bearing
node docs/demos/functional-drafting/encode.mjs bearing
npx tsx docs/demos/functional-drafting/inspect.ts fixture-plate
npx tsx docs/demos/functional-drafting/inspect.ts bearing-seat
node docs/demos/functional-drafting/packetize.mjs
npm run site:build-blog
SITE_BASE_URL=http://127.0.0.1:8000 node docs/demos/functional-drafting/readback.mjs
```

Each final UI capture starts with a fresh owned local Vite process to bound OCCT state. The first plate attempt produced no bytes on a late strict PDF request after earlier exports; its real failed receipt/screenshot are retained in `diagnostics/`. The complete fresh-server captures succeed and are the only frames encoded into the published videos. This is local validation, not a claim that a remote backend has been deployed or that its workers have been physically accepted.

Studio requests automatic annotations. The tutorial suppresses actual report-derived automatic rows through the UI, with their IDs/text/reasons recorded in `suppressedAutomaticRows`, to focus on the explicitly declared interfaces. It changes view/offset for authored labels without typing replacement numbers. The source-bound project settings are temporary and removed after capture; the previous project index, selected project and legacy value are restored, and the owned tab closes. The public tutorial project and cloud projects are untouched.

`encode.mjs` encodes real dialog screenshots with captions, starting at the first meaningful completed preview stage and using 0.8 of captured pause durations. The archive still retains every original preparation and workflow frame. It performs full ffmpeg decode, saves ffprobe and SHA-256 evidence, verifies a compact `frames.zip`, samples three representative MP4 frames, then removes only the owned loose frame directory. Original timestamps stay in the receipt and video metadata; the archive preserves real source frames. Videos are local UI evidence and contain no audio or physical-hardware claim.

`inspection/` holds canonical iso/front/top/left RGB, object-ID mask, linear-camera depth and view-space normal channels. `inspect.ts` uses the existing CAD meshing and demo-player APIs in the same existing Chrome via raw CDP. It avoids the CLI static-render launch path, whose attach fallback does not satisfy the standing browser-reuse rule. The manifests retain source hashes, actual bounds, per-view channel metadata, artifact hashes and owned target identity. Top RGB uses the same flat lighting on horizontal base and pedestal roof; depth distinguishes their elevation.

Export-only bundles and their independent geometry/review assertions come from `examples/functional-drafting/run.ts`. To verify independently without overwriting published assets, use `OUTPUT_ROOT=/tmp/functional-drafting-verification npx tsx examples/functional-drafting/run.ts`. The ordinary/strict generated PDFs and the actual UI-downloaded PDFs are distinct receipts. Completeness covers only declared critical measurements and recorded decisions; reference requirements remain advisory. No numerical fit, tolerance, GD&T, manufacture, load or physical acceptance is certified. The Studio sheet prints its inherited ISO2768-mK default; this tutorial does not select or approve it as engineering acceptance.

`packetize.mjs` copies only successful actual UI deliverables into the native blog asset directories and refreshes their hash inventories. `readback.mjs` checks desktop/mobile layout, every article image and download, and real native video playback in an owned existing-browser tab. Its server is supplied by the operator and should be stopped after the bounded check. `article-readback/` retains screenshots and an HTTP/hash receipt; `pdf-integrity.json` retains pdfinfo results for all ten published PDFs. The generic local Python server lacks the existing site favicon, a separate pre-existing site asset outside these articles.

Helper cleanup regressions: `node --test docs/demos/functional-drafting/lifecycle.test.mjs`. The optional `node docs/demos/functional-drafting/timeout-proof.mjs` runs the actual capture helper against an owned blank HTTP origin with a forced two-second deadline in the existing Chrome. It checks exact index/last/legacy restoration, failed receipt persistence and owned project/tab removal, then removes its test origin state and server. No CAD export or demo artifact is produced.
