// v0.21 hero artifact: parametric donut (body + glaze + sprinkles).
//
// Demonstrates the just-shipped capabilities:
//   - `param()` for editable dimensions (params.update at runtime re-lowers)
//   - ParamRef arithmetic (`.add`, `.subtract`) for derived dimensions
//   - `path()...close().revolve().fillet()` end-to-end parametric — every
//     coord on the revolution profile is a ParamRef
//
// Per the memorable-builds policy (see `kernelCAD-private/docs/process/`).
//
// Limitation worth flagging for agents: `.translate(x, y, z)` accepts plain
// numbers only, not `ParamRef`. So the body/glaze HEIGHTS that feed sprinkle
// Z position stay as literal numbers; PathBuilder is now fully parametric.

const bodyInnerR = param('bodyInnerR', 12);
const bodyOuterR = param('bodyOuterR', 35);
const bodyHeightVal = 18;
const bodyFilletR = param('bodyFilletR', 7);

const glazeOverhang = param('glazeOverhang', 1);
const glazeInset = param('glazeInset', 1);
const glazeHeightVal = 5;
const glazeFilletR = param('glazeFilletR', 1.5);

const sprinkleR = param('sprinkleR', 1);
const sprinkleH = param('sprinkleH', 3);

// Body: rectangular cross-section ring revolved around Z. Coords on the
// revolution profile are ParamRefs so dimensions stay editable end-to-end.
const body = path()
  .moveTo(bodyInnerR, 0)
  .lineTo(bodyOuterR, 0)
  .lineTo(bodyOuterR, bodyHeightVal)
  .lineTo(bodyInnerR, bodyHeightVal)
  .close()
  .revolve()
  .fillet(bodyFilletR);

// Glaze: thinner ring sitting on top of the body, slightly oversized for a
// "drip" silhouette. Inner/outer radii derive from the body via ParamRef
// arithmetic so the glaze tracks the body when params edit.
const glazeOuterR = bodyOuterR.add(glazeOverhang);
const glazeInnerR = bodyInnerR.add(glazeInset);
const glaze = path()
  .moveTo(glazeInnerR, 0)
  .lineTo(glazeOuterR, 0)
  .lineTo(glazeOuterR, glazeHeightVal)
  .lineTo(glazeInnerR, glazeHeightVal)
  .close()
  .revolve()
  .translate(0, 0, bodyHeightVal)
  .fillet(glazeFilletR);

// Sprinkles scattered around the glaze top. Positions are JS-computed (polar
// → Cartesian); only the sprinkle dimensions are parametric.
const sprinkleZ = bodyHeightVal + glazeHeightVal;
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
