# kernelcad.com curated gallery

`entries.json` is the source of truth for the "Built with kernelCAD" gallery on kernelcad.com.

## Adding an entry

1. Add a new object to the top of `entries` (newest first — render order = array order).
2. Use the schema in `scripts/lib/galleryEntries.ts` (Zod, enforced at build time).
3. `video` is a path relative to this directory — pointing at an existing MP4 in the repo (commonly under `docs/demos/v0.X/<task>/`).
4. `codeLocal` is a path to the `.kcad.ts` source — relative to this directory — used to build a GLB for the tile 3D viewer.
5. `prompt` is the actual agent prompt verbatim. Do not edit for "polish."
6. Run `npm run site:build` and visually inspect `site/public/gallery.json` + the rendered landing page (`npm run site:dev`) before committing.

## Curation gate (manual)

Include only builds that meet at least one of:

- Mechanically interesting (assembly, mechanism, mates).
- Visually striking.
- Demonstrates a recently-shipped capability that's worth advertising.

Reject:

- Generic primitives (box, plate, bracket-with-hole) unless they demonstrate a brand-new tool.
- Anything that needs explanatory voiceover to land — the gallery is silent.

Per release, aim to add at most one new entry. The curated gallery is not the per-release demo archive.

## Featured

At most one entry per quarter may set `featured: true`. Renders a small badge.

## Submissions

External submissions arrive via the `gallery-submission` issue template (see `.github/ISSUE_TEMPLATE/`). Triage in the issue, then add to `entries.json` if accepted. (Studio submission flow lands in a later iteration.)
