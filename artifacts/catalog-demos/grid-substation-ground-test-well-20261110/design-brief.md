# Design brief: substation ground-grid test well

## Intent

Refine the existing generic yard prop so its preview reads as an inspection well with a serviceable lid and ground test point, rather than a plain concrete block. Keep its existing ID, CC0 license, material controls, named presets, scale control, and 1,800-triangle ceiling.

## Source plan

- Keep the 650 mm outer chamber width, but make the chamber hollow with a selectable 360/480/620 mm depth.
- Add a raised concrete collar around a removable beveled steel cover, visible fastening points, and two side conduit entries.
- Make the copper ground riser a clamped test terminal on the cover.
- Retain `concrete`, `stainlessSteel`, and `copper` controls and improve both named finish palettes so each changes all three materials.

## Verification

Evaluate and render from the `.kcad.ts` source; compare all three depth choices and the maintenance palette; render the full 80-ID kit preview set; rebuild the generated catalog index; check source hash, preview path, parameter/preset rows, and triangle budget; run the kit lint and catalog integration tests; inspect representative rendered previews and the MP4.

These generic low-poly dimensions are visualization choices, not electrical specifications or field guidance.
