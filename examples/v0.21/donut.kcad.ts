// v0.21 hero artifact: donut with glaze and sprinkles.
//
// Built using only v0.1/v0.2/v0.21-available primitives (no torus primitive
// in current API). Body is a square-cross-section ring via revolveRect, then
// .fillet() rounds every edge so it reads as a torus. Glaze is a thinner
// ring sitting on top, slightly oversized for a "drip" silhouette. Sprinkles
// are small extruded cylinders scattered on the glaze top.
//
// Per memorable-builds policy spec §2 (v0.21 catalog entry).

const bodyInnerR = 12;
const bodyOuterR = 35;
const bodyHeight = 18;
const bodyFillet = 7;

const glazeOverhang = 1;
const glazeInset = 1;
const glazeHeight = 5;
const glazeFillet = 1.5;

const sprinkleR = 1;
const sprinkleH = 3;

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
