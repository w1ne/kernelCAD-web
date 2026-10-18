# Fast parameter edits: the browser kernel

The hosted Studio (`app.kernelcad.com/studio`) can run the geometry kernel —
the same script runtime and OCCT mesher the server uses — **inside a Web
Worker in your browser**. When it is active, moving a parameter slider
recomputes the model locally: nothing is uploaded, nothing is downloaded, and
edits land in milliseconds instead of a server round trip.

## What changes for you

- **Parameter edits**: with a warm browser kernel, a slider or numeric edit
  recomputes in the worker and only the parts whose geometry changed are
  repainted (a few kilobytes, typically). The Params tab shows the usual
  sliders; there is no new UI.
- **First open**: the model paints from the published precomputed mesh
  instantly, then the kernel warms in the background. Edits made before the
  warm completes go through the server as usual, then switch over seamlessly.
- **Everything else stays server-side**: code editing with a live session,
  exports, share pages, embeds, and any model that needs files from a project
  (imported STEP/STL parts, the standard-parts catalog) keep using the server
  kernel.

## When it falls back

If the browser kernel cannot run a model — a source that needs project files,
a worker crash, a low-memory device — the Studio marks that model as
server-only for the session and every edit goes through the server path
(which stays rate-limited and cached exactly as before). Nothing breaks; it
is just slower.

## Turning it off

Append `?kernel=off` to a Studio URL to force the server path, or
`?kernel=force` to try the browser kernel even where it is not yet enabled by
default. The feature is rolling out behind a flag while its measurements are
verified (see `docs/superpowers/plans/artifacts/2026-10-18-browser-kernel/`).
