// 20x20 B-type T-slot extrusion (slot 6) cut to a length param, plus a corner connector.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/tslot-extrusion-and-bracket.kcad.ts
//
// Expected console output:
//   Features: 23
//   OK

const length = param('length', 120, { min: 20, max: 800 });
const profileSize = 20;
const slotOpening = 6;
const slotInner = 11;
const lip = 1.6;
const slotDepth = 6.2;
const coreR = 2.1; // Ø4.2 core

function slotCutter() {
  const halfOpen = slotOpening / 2;
  const halfWide = slotInner / 2;
  // The pocket walls slope at 45° and stop web/2 short of the diagonals,
  // as on a real B-type profile: neighbouring pockets never meet, so a
  // diagonal web ties each corner land to the core. Square pockets would
  // merge at the corners and cut the four corner lands free.
  const web = 1.5;
  const d = (web / 2) * Math.SQRT2;
  const floorY = profileSize / 2 - slotDepth;
  const lipY = profileSize / 2 - lip;
  const topY = profileSize / 2 + 1;
  // Overshoot the length param range so the channel is always through.
  return extrudePolygon([
    [-(floorY - d), floorY], [floorY - d, floorY],
    [halfWide, halfWide + d], [halfWide, lipY],
    [halfOpen, lipY], [halfOpen, topY],
    [-halfOpen, topY], [-halfOpen, lipY],
    [-halfWide, lipY], [-halfWide, halfWide + d],
  ], 802).translate(0, 0, -1);
}

let bar = box(profileSize, profileSize, length)
  .translate(-profileSize / 2, -profileSize / 2, 0);
for (const deg of [0, 90, 180, 270]) {
  bar = bar.subtract(slotCutter().rotateZ(deg));
}
const extrusion = bar.subtract(cylinder(200, coreR).translate(0, 0, -1));

// Gauge sitting in the +Y face opening so inspect can read the 6 mm slot.
const gauge = box(slotOpening, 0.2, 20).translate(-slotOpening / 2, profileSize / 2 - 0.1, 50);

const plateT = 3;
const leg = 28;
const connector = box(leg, profileSize, plateT)
  .union(box(plateT, profileSize, leg).translate(0, 0, plateT))
  .subtract(cylinder(plateT + 2, 2.75).translate(leg - 10, profileSize / 2, -1))
  .subtract(cylinder(leg + 2, 2.75).translate(plateT / 2, profileSize / 2, -1));

const arm = assembly('tslot-extrusion-and-connector');
arm.part('extrusion', extrusion);
arm.part('slot-opening-gauge', gauge);
arm.part('corner-connector', connector, { at: [profileSize + 6, -profileSize / 2, 0] });
return arm.model();
