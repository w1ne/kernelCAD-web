// The same backplate quarter with a rounded end corner.
//
// `endTangent: [0, 1]` makes the last smoothSpline arrive travelling +Y, so
// it meets the straight end edge without a corner. Without the option the
// segment arrives travelling +X.

const HALF_LENGTH = 46;   // mm
const HALF_WAIST = 7;     // mm
const HALF_END = 14;      // mm
const WAIST_FLAT = 4;     // mm
const KNEE: [number, number] = [22, -8.5];  // mm
const FLARE_END = 40;     // mm
const CORNER_TOP = -8;    // mm, the rounded corner ends here on the end edge
const THICKNESS = 3;      // mm

return path()
  .moveTo(0, -HALF_WAIST)
  .lineTo(WAIST_FLAT, -HALF_WAIST)
  .smoothSpline(KNEE[0], KNEE[1])
  .smoothSpline(FLARE_END, -HALF_END)
  .smoothSpline(HALF_LENGTH, CORNER_TOP, { endTangent: [0, 1] })
  .lineTo(HALF_LENGTH, 0)
  .lineTo(0, 0)
  .close()
  .extrude(THICKNESS);
