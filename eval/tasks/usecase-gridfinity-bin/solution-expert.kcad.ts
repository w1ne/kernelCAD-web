// [dogfood] Gridfinity 2x1 bin, 6 units tall, with base magnet holes and one divider.
// Grid pitch 42mm, height unit 7mm. Base stack matches the official Gridfinity
// profile (bottom-up): 0.8mm 45deg chamfer, 1.8mm straight, 2.15mm 45deg chamfer
// = 4.75mm total base height, tapering the foot from a small tip up to full
// body width so the bin nests into a Gridfinity baseplate.
//
// NOTE on box(): box(w,d,h,true) centers ALL THREE axes at the origin (verified
// empirically against the live server: bbox came back [-5,-5,-5]..[5,5,5] for
// box(10,10,10,true) -- it is NOT "XY centered, Z from 0" the way cylinder is).
// So every box below uses box(w,d,h,true).translate(0,0,h/2) to get XY centered
// at the origin with Z running 0..h.

const nx = 2, ny = 1;
const gridUnit = 42;
const heightUnit = 7;
const units = 6;

const clearance = 0.5;        // total XY clearance vs. the nominal grid (fits the baseplate)
const wallThickness = 1.6;    // >= 1.2mm FDM minimum
const baseBottomChamfer = 0.8;
const baseStraight = 1.8;
const baseTopChamfer = 2.15;
const baseHeight = baseBottomChamfer + baseStraight + baseTopChamfer; // 4.75mm

// NOTE (found during DFM verification): the "canonical" 6mm-diameter magnet
// hole at a 4.8mm inset does NOT clear the official base taper for a 1-cell-
// deep (ny=1) bin -- the taper's smallest cross-section (the foot tip, F0)
// leaves only ~1.85mm of margin there, so a 3mm hole radius punches through
// the side with a razor-thin (0.016mm) remaining skin (a real dfm.wall.too-
// thin failure, not a cosmetic one). Using smaller, widely-available 4mm x
// 2mm magnets at a larger inset keeps >=1.2mm of material at the foot tip.
const magnetHoleD = 4.0;
const magnetHoleDepth = 2.0;
const magnetInset = 7.0;      // widened from the common 4.8mm to clear the base taper (see note)
const dividerThickness = 1.6;

const totalHeight = units * heightUnit; // 42mm

const fullW_nom = nx * gridUnit; // 84
const fullD_nom = ny * gridUnit; // 42

const W = fullW_nom - clearance; // 83.5 -- actual printed outer footprint
const D = fullD_nom - clearance; // 41.5

const F1w = W - 2 * baseTopChamfer; // 79.2 -- footprint after the top chamfer tapers down
const F1d = D - 2 * baseTopChamfer; // 37.2

function centeredBox(w: number, d: number, h: number) {
  return box(w, d, h, true).translate(0, 0, h / 2);
}

// Bottom stage: nominal footprint F1, chamfer its bottom edge by 0.8mm so the
// very tip (z=0) shrinks to F1-1.6, widening back to F1 at z=0.8, then holds
// F1 straight up to z=2.6 (0.8 + 1.8).
let boxBottom = centeredBox(F1w, F1d, baseBottomChamfer + baseStraight);
boxBottom = boxBottom.chamfer(baseBottomChamfer, { atZ: 0 });

// Top stage: nominal footprint W (full body), chamfer its own bottom edge (at
// its LOCAL z=0, before the translate below) by 2.15mm so it tapers from F1
// up to the full W width over that height, then sits translated to z=2.6 so
// it lands exactly on top of boxBottom with matching F1 width at the seam.
let boxTop = centeredBox(W, D, totalHeight - (baseBottomChamfer + baseStraight));
boxTop = boxTop.chamfer(baseTopChamfer, { atZ: 0 });
boxTop = boxTop.translate(0, 0, baseBottomChamfer + baseStraight);

let bin = boxBottom.union(boxTop);

// Hollow the interior above the solid base stack.
const cavityW = W - 2 * wallThickness;
const cavityD = D - 2 * wallThickness;
const cavityH = totalHeight - baseHeight + 1; // +1mm overshoot: clean open top
// BUG FOUND DURING VERIFICATION (fixed here): box(w,d,h,true) centers ALL
// THREE axes, so a bare box(...,true).translate(0,0,baseHeight) put the
// cavity's Z-range at [baseHeight - cavityH/2, baseHeight + cavityH/2] --
// far too low, eating into the solid base stack entirely (a z=1 section
// scan came back empty everywhere once this ran). Use centeredBox() like
// everywhere else so Z runs 0..cavityH before the baseHeight lift.
const cavity = centeredBox(cavityW, cavityD, cavityH).translate(0, 0, baseHeight);
bin = bin.subtract(cavity);

// One divider at the shared cell boundary (x = 0), splitting the 2x1 bin into
// two 1x1 compartments, full cavity depth and full cavity height.
const divider = centeredBox(dividerThickness, cavityD, totalHeight - baseHeight)
  .translate(0, 0, baseHeight);
bin = bin.union(divider);

// Magnet holes: 4 per grid cell (standard Gridfinity layout), 4.8mm inset from
// each cell edge, drilled blind from the underside.
for (let ix = 0; ix < nx; ix++) {
  const cellX0 = -fullW_nom / 2 + ix * gridUnit;
  for (let iy = 0; iy < ny; iy++) {
    const cellY0 = -fullD_nom / 2 + iy * gridUnit;
    const positions: [number, number][] = [
      [magnetInset, magnetInset],
      [magnetInset, gridUnit - magnetInset],
      [gridUnit - magnetInset, magnetInset],
      [gridUnit - magnetInset, gridUnit - magnetInset],
    ];
    for (const [lx, ly] of positions) {
      const hole = cylinder(magnetHoleDepth + 0.5, magnetHoleD / 2)
        .translate(cellX0 + lx, cellY0 + ly, -0.3);
      bin = bin.subtract(hole);
    }
  }
}

dfmSpec({ minWall: 1.2, minClearance: 0.3 });

return bin;
