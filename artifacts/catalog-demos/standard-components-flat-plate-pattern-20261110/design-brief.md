# Design brief — flat joining plate hole pattern

## Intent

Refine the existing `standard-components/flat-joining-plate` so a scene designer
can choose a three-, four-, or five-hole in-line strap and get the matching
plate length, real through-bores, and installed fastener count. Keep the
existing compact/standard/large overall size choice and named palettes, with a
clear blue powder-coated steel body and contrasting silver zinc-plated hardware
in the default palette.

## Geometry assumptions

- The generic standard layout keeps the existing 20 mm hole pitch.
- Keep 12 mm of material from each end hole centre to the plate end, yielding
  64 mm, 84 mm, and 104 mm strap lengths for three, four, and five holes.
- Keep the 24 mm plate width, 5 mm thickness, and 6 mm through-bores. The
  installed zinc-colored shanks are 4.6 mm in diameter and remain centered in
  each bore; the 8 mm fastener heads sit on the top face.
- `compact` and `large` continue scaling the full assembly by 0.75 and 1.25.
- Keep the two existing material controls (`steel`, `zinc`) and their parameter
  names. The labels identify painted steel and zinc-plated fasteners.
- These dimensions are generic visualization assumptions, not a standard,
  vendor design, fit recommendation, or manufacturing specification.

## Source and evidence plan

- Source of truth: `catalog/kits/standard-components/flat-joining-plate.kcad.ts`.
- Keep the existing catalog ID, two material controls, and three palettes. The
  measured five-hole variant uses 712 triangles, so set an 800-triangle budget
  to leave a modest margin without decimating the selectable layout.
- Render the three hole-count choices from source, regenerate the catalog
  preview and index, run the quality audit, kit lint and catalog integration
  suite, then inspect three colored variant renders and the MP4.
- Check the generated local catalog page. The branch is not deployed; live
  deployment verification remains pending merge and deploy.
