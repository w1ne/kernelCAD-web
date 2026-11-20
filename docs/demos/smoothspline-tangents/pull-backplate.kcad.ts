// Drawer-pull backplate, 92 × 28 × 3 mm, drawn as one quarter and mirrored.
//
// The waisted edge is a short flat and two chained smoothSpline segments.
// The quarter is mirrored across the sketch X axis, the sketch Y axis and
// both, and the four quarters are joined. Two Ø4.2 mm holes on a 64 mm pitch
// take the pull screws.

const HALF_LENGTH = 46;   // mm, plate is 92 long
const HALF_WAIST = 7;     // mm, 14 wide at the centre
const HALF_END = 14;      // mm, 28 wide at the ends
const WAIST_FLAT = 4;     // mm, half of the straight run at the centre
const KNEE: [number, number] = [22, -8.5];  // mm, where the waist starts to flare
const FLARE_END = 40;     // mm, the waisted edge ends here
const THICKNESS = 3;      // mm
const SCREW_PITCH = 64;   // mm
const SCREW_HOLE = 4.2;   // mm, M4 clearance

const quarter = path()
  .moveTo(0, -HALF_WAIST)
  .lineTo(WAIST_FLAT, -HALF_WAIST)
  .smoothSpline(KNEE[0], KNEE[1])
  .smoothSpline(FLARE_END, -HALF_END)
  .lineTo(HALF_LENGTH, -HALF_END)
  .lineTo(HALF_LENGTH, 0)
  .lineTo(0, 0)
  .close();

const plate = quarter.extrude(THICKNESS)
  .union(quarter.reflect('x').extrude(THICKNESS))
  .union(quarter.reflect('y').extrude(THICKNESS))
  .union(quarter.reflect('x').reflect('y').extrude(THICKNESS));

const hole = (x: number) => cylinder(THICKNESS + 2, SCREW_HOLE / 2).translate(x, 0, -1);

return plate.subtract(hole(-SCREW_PITCH / 2)).subtract(hole(SCREW_PITCH / 2));
