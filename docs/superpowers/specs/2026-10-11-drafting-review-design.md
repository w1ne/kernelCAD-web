# Editable manufacturing drawings

The user approved porting the three reviewed CADalyst workflow ideas into kernelCAD:
annotation review, manufacturing dimensioning styles, and reusable drafting profiles.
The deliverables also include runnable examples, visible website documentation, and a
detailed drafting post. The existing drawing renderer remains the implementation base.

## Engineering and product contract

- Existing SVG/PDF export defaults remain compatible when the new options are absent.
- `draftingProfile` accepts a named `general`, `machining`, or `sheet-metal` profile or a
  JSON profile object. Explicit export options win over profile defaults. A profile stores
  sheet, projection, dimensioning style, optional notes and explicitly chosen tolerance.
  Process names do not imply a part is manufacturable or its tolerances are approved.
- `autoAnnotate.dimensioningStyle` supports `baseline`, `chain`, and `symmetry`.
  Baseline retains the current behavior. Chain dimensions ordered feature positions from
  a chosen datum. Symmetry requires a verified mirrored arrangement and a visible center
  reference; asymmetric cases fall back to baseline.
- Automatic drawing annotations have deterministic semantic IDs in their report and SVG.
  `annotationOverrides[id]` supports suppression, primary text, view and sheet-mm offset.
  Geometric selection and numeric dimensions remain tied to the model. Unmatched IDs
  produce a warning rather than silently applying an edit to another feature.
- The report distinguishes visible, overlapped, and suppressed annotations. Editing a
  primary label does not replace its attached tolerance frame. Invalid views that collapse
  a measurement must fail clearly.

## Review experience and persistence

Studio's Export tab provides drawing preview, annotation selection, keep/hide, text/view/
offset editing, profile/style selection, profile saving and a final PDF export. Model-space
datum queries remain explicit. Existing toolbar and palette exports use saved drawing choices.
Persist settings per project with a source fingerprint. Geometry edits invalidate stale
overrides visibly. Custom profiles are JSON data, not executable source. Preview responses
carry SVG, report and diagnostics through the same export pipeline.

The local and production export endpoints accept SVG/PDF drawing formats and drawing
options. `review=1` returns JSON `{svg,drawingReport,diagnostics}` for an SVG preview.
Final PDF export keeps the current asynchronous download flow. Production runtime must
use the exact updated vendor pin; frontend-only deployment does not prove this behavior.

## Examples and public content

Use one dimensioned mounting plate to explain baseline, chain, and symmetry differences,
and a connected bearing-mount part to explain datums, holes, sections and tolerances.
Commit editable source and an explicit generator. Derive downloadable PDF/SVG sheets and
PNG previews from that source. Visually inspect generated sheets and 3D inspection views.

The post explains datum choices, measurement references, views, hole notes, tolerance
review, annotation edits and revision handling. The website links to the examples and
downloads; it describes verified behavior and states engineering review requirements.
Do not copy competitor text, performance figures, or claim physical shop acceptance.

## Verification and integration

Engine: focused geometry tests for all styles, overrides, stale IDs, profile precedence,
determinism, invalid inputs and declared GD&T preservation. Studio: preview/transport,
persistence and source invalidation, edit controls and final export. Server: matching
preview/options contract and unchanged ordinary exports. Examples: actual evaluations,
exports, dimensional checks and visual review. Run lint/typecheck/build and applicable CI,
review changes, integrate through protected PRs, then verify exact live routes/assets.
