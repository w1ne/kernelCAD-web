// L mounting bracket with dimensions declared for the 3D viewer.
//
// A 60 x 40 x 6 base plate bolts down through four 5 mm holes; a 6 mm
// upright rises from the back edge. shape.dimension() declares what the
// viewer should call out, so the Dimensions toggle is on by default.
//
// Expected declared dimension texts (in order):
//   hole spacing X 40
//   hole spacing Y 18
//   thickness 6
//   bolt hole Ø5
const baseW = 60;
const baseD = 40;
const t = 6;
const uprightH = 40;

// Four 5 mm through-holes on a 40 x 18 pattern, clear of the upright.
// u/v are measured from the centre of the base's top face.
const base = box(baseW, baseD, t).holes('top', {
  positions: [{ u: -20, v: -12 }, { u: 20, v: -12 }, { u: -20, v: 6 }, { u: 20, v: 6 }],
  diameter: 5,
  depth: 'through',
});

let bracket = base.union(box(baseW, t, uprightH).translate(0, baseD - t, t));

// A circular edge anchor measures to the hole centre, so these are
// centre-to-centre spacings. Labels are names; the value is appended.
const hole = (x: number, y: number) => ({ edge: { ofCurveType: 'CIRCLE' as const, near: [x, y, t] as [number, number, number] } });

bracket = bracket
  .dimension({ kind: 'linear', from: hole(10, 8), to: hole(50, 8), label: 'hole spacing X' })
  .dimension({ kind: 'linear', from: hole(10, 8), to: hole(10, 26), label: 'hole spacing Y' })
  .dimension({ kind: 'linear', from: [0, 0, 0], to: [0, 0, t], label: 'thickness' })
  .dimension({ kind: 'diameter', edge: hole(10, 8).edge, label: 'bolt hole' });

return bracket;
