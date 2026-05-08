// v0.21 hero artifact: parametric donut (body + glaze + sprinkles).
//
// Demonstrates the full parametric closure of the public surface:
//   - `param()` for editable dimensions (params.update at runtime re-lowers)
//   - ParamRef arithmetic (`.add`, `.subtract`) for derived dimensions
//   - `path()...close().revolve()...fillet()` end-to-end parametric — every
//     coord on the revolution profile is a ParamRef
//   - `.translate(x, y, z)` accepts ParamRef on every coord, so derived
//     positions (sprinkleZ = bodyHeight + glazeHeight) stay editable too
//
// After this slice, every editable dimension in this file is a param —
// no literal numbers feed downstream geometry.
//
// Per the memorable-builds policy (see `kernelCAD-private/docs/process/`).

const bodyInnerR = param('bodyInnerR', 12);
const bodyOuterR = param('bodyOuterR', 35);
const bodyHeight = param('bodyHeight', 18);
const bodyFilletR = param('bodyFilletR', 7);

const glazeOverhang = param('glazeOverhang', 1);
const glazeInset = param('glazeInset', 1);
const glazeHeight = param('glazeHeight', 5);
const glazeFilletR = param('glazeFilletR', 1.5);

const sprinkleR = param('sprinkleR', 1);
const sprinkleH = param('sprinkleH', 3);

// Body: rectangular cross-section ring revolved around Z. Coords on the
// revolution profile are ParamRefs so dimensions stay editable end-to-end.
const body = path()
  .moveTo(bodyInnerR, 0)
  .lineTo(bodyOuterR, 0)
  .lineTo(bodyOuterR, bodyHeight)
  .lineTo(bodyInnerR, bodyHeight)
  .close()
  .revolve()
  .fillet(bodyFilletR);

// Glaze: thinner ring sitting on top of the body, slightly oversized for a
// "drip" silhouette. Inner/outer radii derive from the body via ParamRef
// arithmetic so the glaze tracks the body when params edit. The translate
// Z is `bodyHeight` itself — a ParamRef — so it tracks edits live.
const glazeOuterR = bodyOuterR.add(glazeOverhang);
const glazeInnerR = bodyInnerR.add(glazeInset);
const glaze = path()
  .moveTo(glazeInnerR, 0)
  .lineTo(glazeOuterR, 0)
  .lineTo(glazeOuterR, glazeHeight)
  .lineTo(glazeInnerR, glazeHeight)
  .close()
  .revolve()
  .translate(0, 0, bodyHeight)
  .fillet(glazeFilletR);

// Sprinkles scattered around the glaze top. Positions are JS-computed (polar
// → Cartesian); only the sprinkle dimensions and Z are parametric. The Z
// position is `bodyHeight + glazeHeight` — a composed ParamRef — so the
// sprinkles ride on top of the glaze even after live param edits.
const sprinkleZ = bodyHeight.add(glazeHeight);
const sprinklePolar: Array<[number, number]> = [
  [22, 15], [18, 60], [25, 105], [20, 150],
  [23, 200], [19, 245], [22, 290], [21, 335],
];
const sprinkles = sprinklePolar.map(([radius, deg]) => {
  const rad = (deg * Math.PI) / 180;
  return cylinder(sprinkleH, sprinkleR).translate(
    radius * Math.cos(rad),
    radius * Math.sin(rad),
    sprinkleZ,
  );
});

return body.union(glaze, ...sprinkles);
