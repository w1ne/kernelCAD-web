// v0.21 hero artifact: donut with glaze and sprinkles.
//
// Built using only v0.1/v0.2/v0.21-available primitives (no torus primitive
// in current API). Body is a square-cross-section ring via revolveRect, then
// .fillet() rounds every edge so it reads as a torus. Glaze is a thinner
// ring sitting on top, slightly oversized for a "drip" silhouette. Sprinkles
// are small extruded cylinders scattered on the glaze top.
//
// Per memorable-builds policy spec §2 (v0.21 catalog entry).

const bodyInnerR = param('Hole radius', 12, { unit: 'mm', min: 8, max: 20 });
const bodyOuterR = param('Outer radius', 35, { unit: 'mm', min: 25, max: 50 });
const bodyHeight = param('Body height', 18, { unit: 'mm', min: 12, max: 24 });
const bodyFillet = param('Body fillet', 7, { unit: 'mm', min: 3, max: 12 });

const glazeOverhang = param('Glaze overhang', 1, { unit: 'mm', min: 0, max: 4 });
const glazeInset = param('Glaze inset', 1, { unit: 'mm', min: 0, max: 4 });
const glazeHeight = param('Glaze height', 5, { unit: 'mm', min: 2, max: 8 });
const glazeFillet = param('Glaze fillet', 1.5, { unit: 'mm', min: 0.5, max: 3 });

const sprinkleR = param('Sprinkle radius', 1, { unit: 'mm', min: 0.5, max: 2 });
const sprinkleH = param('Sprinkle height', 3, { unit: 'mm', min: 1.5, max: 5 });

const body = revolveRect(
  bodyOuterR - bodyInnerR,
  bodyHeight,
  bodyInnerR,
).fillet(bodyFillet);

const glaze = revolveRect(
  (bodyOuterR + glazeOverhang) - (bodyInnerR + glazeInset),
  glazeHeight,
  bodyInnerR + glazeInset,
)
  .translate(0, 0, bodyHeight)
  .fillet(glazeFillet);

const sprinkleZ = bodyHeight + glazeHeight;

const sprinklePolar: Array<[number, number]> = [
  [22, 15],
  [18, 60],
  [25, 105],
  [20, 150],
  [23, 200],
  [19, 245],
  [22, 290],
  [21, 335],
];

const sprinkles = sprinklePolar.map(([r, deg]) => {
  const rad = (deg * Math.PI) / 180;
  return cylinder(sprinkleH, sprinkleR).translate(
    r * Math.cos(rad),
    r * Math.sin(rad),
    sprinkleZ,
  );
});

return body.union(glaze, ...sprinkles);
