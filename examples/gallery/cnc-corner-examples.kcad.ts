// CNC internal-corner examples used in the "Internal corner radius for CNC
// machining" guide. Set `variant` to pick one part, then run dfm_review
// with processes: ['cnc'].
//
//   'fillet'   70 x 50 x 20 block, 40 x 30 x 10 pocket with R2.5 corners.
//              Fails cnc.internal-corner-radius with a 6 mm end mill (R3),
//              passes with tool_diameter_mm: 4 (R2).
//   'groove'   70 x 50 x 20 block with a 10 mm deep, 6 mm tall groove cut
//              into the +X side. Fails cnc.undercuts from ['+z'] (1300 mm2
//              unreachable), passes with approach_axes ['+z', '+x'].
//   'square'   60 x 60 x 16 plate, 30 x 30 x 10 pocket for a square insert
//              with sharp corners. Fails for a 6 mm end mill.
//   'dogbone'  The same pocket with an R3.2 dogbone relief at each corner:
//              a cutter circle whose edge passes through the sharp corner.
//              Passes for a 6 mm end mill, and a square insert still seats
//              fully.
const variant = 'dogbone' as 'fillet' | 'groove' | 'square' | 'dogbone';

function filletPocket() {
  const cornerR = 2.5; // below R3 of a 6 mm end mill; fine for a 4 mm one
  const pocket = box(40, 30, 10)
    .fillet(cornerR, { parallel: [0, 0, 1] })
    .translate(15, 10, 10);
  return box(70, 50, 20).subtract(pocket);
}

function sideGroove() {
  // Open on +X, +Y and -Y: the groove's floor sits under its own ceiling,
  // so the tool cannot reach it from the top.
  const groove = box(10, 50, 6).translate(60, 0, 6);
  return box(70, 50, 20).subtract(groove);
}

function squarePocket(dogbones: boolean) {
  const insert = 30; // square insert, mm
  const depth = 10;
  const plateT = 16;
  const x0 = 15;
  const y0 = 15;
  let part = box(60, 60, plateT).subtract(
    box(insert, insert, depth).translate(x0, y0, plateT - depth),
  );
  if (!dogbones) return part;
  const reliefR = 3.2; // just over R3 of a 6 mm end mill
  // Tool centre on the corner diagonal, inside the pocket, R/sqrt(2) from each
  // wall: the cutter circle then passes exactly through the sharp corner.
  const d = reliefR / Math.SQRT2;
  // [corner x, corner y, inward x, inward y]
  const corners = [
    [x0, y0, 1, 1],
    [x0 + insert, y0, -1, 1],
    [x0, y0 + insert, 1, -1],
    [x0 + insert, y0 + insert, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    // cylinder(height, radius), base at z = 0
    part = part.subtract(
      cylinder(depth, reliefR).translate(cx + sx * d, cy + sy * d, plateT - depth),
    );
  }
  return part;
}

if (variant === 'fillet') return filletPocket();
if (variant === 'groove') return sideGroove();
return squarePocket(variant === 'dogbone');
