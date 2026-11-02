// Parametric electronics enclosure; dimensions in millimetres.
// Minimum footprint keeps the internal PCB posts clear of the lid bosses,
// including at the maximum wall setting.
const L = param('length', 100, { min: 80, max: 200 });
const W = param('width', 70, { min: 60, max: 140 });
const H = param('height', 35, { min: 20, max: 80 });
const wall = param('wall', 2.5, { min: 1.5, max: 5 });
const lidT = param('lidThickness', 2.5, { min: 1.5, max: 5 });

const arm = assembly('enclosure');

let base = box(L, W, H);
base = base.subtract(
  box(L.subtract(wall.multiply(2)), W.subtract(wall.multiply(2)), H.subtract(wall))
    .translate(wall, wall, wall),
);

// Corner bosses inside the cavity, tapped M3 through the floor; matching M3
// clearance holes (ISO 273 normal, 3.4 mm) in the lid.
const bossR = 5;
const inset = wall.add(8);
const corners = [
  [inset, inset],
  [L.subtract(inset), inset],
  [inset, W.subtract(inset)],
  [L.subtract(inset), W.subtract(inset)],
] as const;
for (const [x, y] of corners) {
  base = base.union(cylinder(H.subtract(wall), bossR).translate(x, y, wall));
}
// Entry face: the outside of the floor. After the cavity cut 'bottom' is
// ambiguous (the inner floor also came from it), so pick it by normal + z.
// hole u/v are offsets from the centre of that face (u = +X, v = +Y).
// thread: diameter is the nominal M3; the kernel drills the ISO minor diameter
// (2.46 mm tap drill) up through floor and boss. Not a subtracted cylinder.
const fromCentre = corners.map(([x, y]) => ({ u: x.subtract(L.divide(2)), v: y.subtract(W.divide(2)) }));
base = base.holes({ byNormal: '-Z', atZ: 0 }, {
  positions: fromCentre,
  diameter: 3,
  depth: H, // full height: 'through' would stop where the floor opens into the cavity
  thread: { pitch: 0.5 },
  name: 'bossTap',
});
// Four PCB posts on a 30 × 20 mm pattern. The 2.7 mm through bores accept
// screws from the underside; choose length and hardware for the actual board.
const postPositions = [[-15, -10], [15, -10], [-15, 10], [15, 10]] as const;
for (const [x, y] of postPositions) {
  base = base.union(cylinder(6.2, 3.5).translate(L.divide(2).add(x), W.divide(2).add(y), wall.subtract(0.2)));
}
base = base.holes({ byNormal: '-Z', atZ: 0 }, {
  positions: postPositions.map(([u, v]) => ({u, v})), diameter: 2.7,
  depth: wall.add(6), name: 'pcbMounts',
});
// Rectangular 16 × 10 mm connector window, cut through the front wall.
// It is a starter opening; measure the chosen connector before production.
base = base.subtract(box(16, wall.add(0.4), 10).translate(L.divide(2).subtract(8), -0.2, 8));
base = base.fillet(1, { parallel: [0, 0, 1] });
arm.part('base', base, { material: 'abs' });

let lid = box(L, W, lidT).holes('top', {
  positions: fromCentre,
  diameter: 3.4,
  depth: 'through',
  name: 'lidClear',
});
// The lid lip starts 0.5 mm inboard of the cavity wall on each side.
// It needs a printed fit trial; this is not a seal or IP rating.
const lipInset = wall.add(0.5);
const innerInset = lipInset.add(1.5);
const lip = box(L.subtract(lipInset.multiply(2)), W.subtract(lipInset.multiply(2)), 1.6)
  .translate(lipInset, lipInset, -1.5)
  .subtract(box(L.subtract(innerInset.multiply(2)), W.subtract(innerInset.multiply(2)), 2)
    .translate(innerInset, innerInset, -1.7));
lid = lid.union(lip);
arm.part('lid', lid.translate(0, 0, H), { material: 'abs' });

return arm.model();
