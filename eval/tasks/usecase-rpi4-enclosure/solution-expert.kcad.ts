// [dogfood] Raspberry Pi 4 Model B two-part enclosure
// Real board dims (RPi4B mechanical drawing): 85 x 56 mm, mounting holes 58x49mm
// pattern, hole centers 3.5mm from each edge (M2.5 clearance 2.75mm).

const boardL = param('boardLength', 85, { min: 80, max: 90 });
const boardW = param('boardWidth', 56, { min: 50, max: 60 });
const holePatL = param('holePatternL', 58, { min: 50, max: 65 });
const holePatW = param('holePatternW', 49, { min: 40, max: 55 });
const wall = param('wall', 2, { min: 1.2, max: 4 });
const floor = param('floorThickness', 2, { min: 1.2, max: 4 });
const standoffH = param('standoffHeight', 3, { min: 2, max: 6 });
const standoffOD = param('standoffOD', 6, { min: 4, max: 9 });
const mountHoleD = param('mountHoleDia', 2.6, { min: 2, max: 3.2 });
const clearance = param('sideClearance', 3, { min: 1, max: 6 });
const boardTopClear = param('boardTopClearance', 20, { min: 10, max: 30 });
const screwHoleD = param('screwHoleDia', 2.8, { min: 2, max: 3.5 });
const bossOD = param('screwBossOD', 6.5, { min: 4, max: 9 });

// Board offset inside the cavity (centered with side clearance).
const offX = wall.add(clearance);
const offY = wall.add(clearance);

const innerL = boardL.add(clearance.multiply(2));
const innerW = boardW.add(clearance.multiply(2));
// BUG FOUND DURING VERIFICATION (fixed here): the base wall height was only
// boardBotClear+standoffH+1 (~7mm), while the lid was a bare flat plate with
// no side wall at all. RPi4 connectors (HDMI/USB/Ethernet) stand well above
// the board top, so the connector cutouts (up to 17mm tall) blew straight
// through the top of that short wall, leaving open notches instead of ports,
// and there was nowhere for the tall components to actually fit. Fix: the
// base carries the FULL enclosure height (standoff + component clearance);
// the lid becomes a flat cap that closes the top. boardBotClear is folded
// into standoffH (the board already only rests on the standoffs).
const baseWallH = standoffH.add(boardTopClear); // floor -> top of base wall

const outerL = innerL.add(wall.multiply(2));
const outerW = innerW.add(wall.multiply(2));

// Hole centers relative to board origin (board local 0,0 at board corner).
// Real RPi4B mounting holes are NOT centered on the 85mm length: they sit
// 3.5mm from the USB-C/HDMI/audio edge (X=0) and 23.5mm short of the
// USB-A/Ethernet edge (X=85), because that edge carries the bulky connector
// stack. Y is symmetric (3.5mm from both 56mm edges).
const holeOffsetX = param('holeOffsetX', 3.5, { min: 2, max: 6 });
const hx0 = holeOffsetX;
const hy0 = (boardW.subtract(holePatW)).divide(2);

function standoffAt(x: number | any, y: number | any) {
  const post = cylinder(standoffH, standoffOD.divide(2)).translate(offX.add(x), offY.add(y), floor);
  const bore = cylinder(standoffH.add(2), mountHoleD.divide(2)).translate(offX.add(x), offY.add(y), floor.subtract(1));
  return post.subtract(bore);
}

// ---------- BASE ----------
let base = box(outerL, outerW, baseWallH.add(floor));
const baseCavity = box(innerL, innerW, baseWallH).translate(wall, wall, floor);
base = base.subtract(baseCavity);

base = base.union(standoffAt(hx0, hy0));
base = base.union(standoffAt(hx0.add(holePatL), hy0));
base = base.union(standoffAt(hx0, hy0.add(holePatW)));
base = base.union(standoffAt(hx0.add(holePatL), hy0.add(holePatW)));

// corner screw bosses for lid fastening (4 screws), placed at the 4 outer corners
// (bossInset must clear the lid countersink radius (3.2mm) AND the connector
// cutout windows on the X=0 side by >= minWall 1.2mm)
const bossInset = 9;
function baseBossAt(x: number, y: number) {
  const post = cylinder(baseWallH.add(floor).subtract(1), bossOD.divide(2)).translate(x, y, 1);
  const bore = cylinder(baseWallH.add(floor).add(2), screwHoleD.divide(2)).translate(x, y, -1);
  return post.subtract(bore);
}
base = base.union(baseBossAt(bossInset, bossInset));
base = base.union(baseBossAt(outerL.subtract(bossInset), bossInset));
base = base.union(baseBossAt(bossInset, outerW.subtract(bossInset)));
base = base.union(baseBossAt(outerL.subtract(bossInset), outerW.subtract(bossInset)));

// board top surface Z (top of standoffs, where connectors sit) for cutout Z placement
const boardZ = floor.add(standoffH);

// USB-C power + 2x micro-HDMI + audio jack cutout, on the X=0 short edge (through base wall)
// Real RPi4 layout along the 56mm edge (Y), approx centers from board edge (offY..offY+boardW):
const usbcY = 7.5, hdmi0Y = 19.5, hdmi1Y = 32, audioY = 47.5;
const connCutH = 10; // cutout window height (Z)
const connCutZ = boardZ.subtract(1); // start slightly below connector face
function edgeCutoutX0(yCenter: number, width: number) {
  return box(wall.add(4), width, connCutH).translate(-2, offY.add(yCenter - width / 2), connCutZ);
}
base = base.subtract(edgeCutoutX0(usbcY, 10));    // USB-C
base = base.subtract(edgeCutoutX0(hdmi0Y, 9));    // micro-HDMI 0
base = base.subtract(edgeCutoutX0(hdmi1Y, 9));    // micro-HDMI 1
base = base.subtract(edgeCutoutX0(audioY, 7));    // audio jack

// 2x USB-A + Ethernet cutout, on the X=boardL short edge (opposite side)
// Punch fully through the outer wall: start inside the cavity (outerL - wall - 2)
// and overshoot the outer face by 2mm so no membrane is left behind (was leaving
// a 1mm skin at the outer face -- a real opening bug, not just a DFM warning).
function edgeCutoutXmax(yCenter: number, width: number, height: number) {
  return box(wall.add(4), width, height).translate(outerL.subtract(wall).subtract(2), offY.add(yCenter - width / 2), connCutZ);
}
base = base.subtract(edgeCutoutXmax(14, 17, 15));   // Ethernet jack (lower)
base = base.subtract(edgeCutoutXmax(40, 17, 17));   // stacked USB2/USB3 (upper, taller)

// SD card slot on the Y=0 long edge, near the X=0 corner, right at board seat level (slot in the board)
const sdX = 15;
base = base.subtract(
  box(12, wall.add(4), 3.5).translate(offX.add(sdX - 6), -2, boardZ.subtract(3.2)),
);

// ---------- LID ----------
// Flat lid plate the same footprint as the base, fastened with 4 screws into
// the base corner bosses (chosen over snap-fits: reliable DFM, reusable).
let lidBody = box(outerL, outerW, wall);

// vent slots on the lid top, a linear pattern of slots
const ventSlot = box(3, 30, wall.add(2)).translate(0, 0, -1);
const ventPattern = ventSlot.patternLinear({ count: 10, direction: [1, 0, 0], spacing: 6 });
const ventGroup = ventPattern.translate(outerL.divide(2).subtract(27), outerW.divide(2).subtract(15), 0);
lidBody = lidBody.subtract(ventGroup);

// lid screw clearance holes aligned with base bosses
function lidHoleAt(x: number, y: number) {
  return cylinder(wall.add(6), screwHoleD.divide(2).add(0.2)).translate(x, y, -3);
}
lidBody = lidBody.subtract(lidHoleAt(bossInset, bossInset));
lidBody = lidBody.subtract(lidHoleAt(outerL.subtract(bossInset), bossInset));
lidBody = lidBody.subtract(lidHoleAt(bossInset, outerW.subtract(bossInset)));
lidBody = lidBody.subtract(lidHoleAt(outerL.subtract(bossInset), outerW.subtract(bossInset)));

// countersink for screw heads on top of lid
function lidCountersinkAt(x: number, y: number) {
  return cylinder(2, 3.2).translate(x, y, wall.subtract(2));
}
lidBody = lidBody.subtract(lidCountersinkAt(bossInset, bossInset));
lidBody = lidBody.subtract(lidCountersinkAt(outerL.subtract(bossInset), bossInset));
lidBody = lidBody.subtract(lidCountersinkAt(bossInset, outerW.subtract(bossInset)));
lidBody = lidBody.subtract(lidCountersinkAt(outerL.subtract(bossInset), outerW.subtract(bossInset)));

dfmSpec({ minWall: 1.2, minClearance: 0.3 });

const enc = assembly('rpi4-enclosure');
const basePart = enc.part('base', base.color('plate'));
const lidPlaced = lidBody.color('frame').translate(0, outerW.add(10), 0);
const lidPart = enc.part('lid', lidPlaced);

// NOTE: base and lid are two loose, unfastened print-plate parts (screwed
// together only after printing) -- not a kinematic mechanism, so no mate
// graph is declared. Evaluate with skipMechanismCheck: true.
return enc.model();
