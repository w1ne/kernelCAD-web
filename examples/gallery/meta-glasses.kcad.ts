// Ray-Ban Meta — Wayfarer (gallery hero).
//
// Gallery-only build targeting visual recognizability as a Wayfarer.
// Visual targets from reference photo:
//   1. Wide trapezoidal acetate frame, wider top than bottom
//   2. Two trapezoidal lens openings (wider at top, narrower at bottom),
//      with an iconic upper-outer "wing" — the corner curls up and out
//   3. Distinctive bridge with a small inverted-V nose notch
//   4. Camera bump + LED on the LEFT lens upper-outer corner (Meta cue)
//
// Coordinate convention: Z-up, right-handed; smallest Y = camera-facing.
// Sketch plane is XZ (sketches authored in (x, z)); body is extruded along
// +Y to give it depth, with the front face at Y=0.

// ----------------------------------------------------------------------------
// Parameters
// ----------------------------------------------------------------------------
const FRAME_DEPTH = 8;          // front-to-back acetate thickness

// Bridge dimensions
const BRIDGE_W = 16;            // bridge width (at narrowest top point)

// Lens trapezoid — wider at top, narrower at bottom (Wayfarer signature)
// 20% bottom-narrowing is the iconic Wayfarer proportion.
const LENS_TOP_W = 46;          // top edge length of a single lens
const LENS_BOT_W = 36;          // bottom edge length (≈22% narrower than top)
const LENS_H = 42;              // vertical lens height

// Frame rim widths (thickness of acetate surrounding each lens)
const RIM_TOP = 7;              // top rim above the lens
const RIM_BOT = 8;              // bottom rim below the lens
const RIM_OUTER = 6;            // outer rim beside the lens (where wing is)
const WING_RISE = 2;            // extra height of the outer-top "wing" corner — subtle

// Derived
const HALF_BRIDGE = BRIDGE_W / 2;
const LENS_INNER_TOP_X = HALF_BRIDGE;
const LENS_OUTER_TOP_X = HALF_BRIDGE + LENS_TOP_W;
const LENS_INNER_BOT_X = HALF_BRIDGE + (LENS_TOP_W - LENS_BOT_W) / 2;
const LENS_OUTER_BOT_X = LENS_INNER_BOT_X + LENS_BOT_W;
const FRAME_HALF_W = LENS_OUTER_TOP_X + RIM_OUTER;

const LENS_Z_TOP = LENS_H / 2;
const LENS_Z_BOT = -LENS_H / 2;
const FRAME_Z_TOP = LENS_Z_TOP + RIM_TOP;
const FRAME_Z_BOT = LENS_Z_BOT - RIM_BOT;
const WING_Z_TOP = FRAME_Z_TOP + WING_RISE;

// The bridge top sits FLUSH with the rest of the upper frame edge (FRAME_Z_TOP).
// On a Wayfarer the brow is essentially one continuous line — there is no
// stepped dip between bridge and wing. The nose notch is a SMALL inverted
// V cut into this line from below.
const BRIDGE_TOP_Z = FRAME_Z_TOP;

// Lens corner radii
const LENS_OUTER_TOP_R = 6;     // upper-outer (wing) corner — generous
const LENS_INNER_TOP_R = 4;     // upper-inner (bridge side)
const LENS_INNER_BOT_R = 5;
const LENS_OUTER_BOT_R = 5;

// Bridge nose notch (small inverted-V on the bridge top)
const NOSE_NOTCH_W = 7;
const NOSE_NOTCH_DEPTH = 3.5;

// Camera + LED
const CAMERA_R = 4.2;
const CAMERA_DEPTH = 2.5;
const LED_R = 0.9;
const LED_DEPTH = 0.8;

// ----------------------------------------------------------------------------
// Full-width frame silhouette — drawn as ONE closed path spanning the
// full width so the body is intrinsically symmetric.
//
// `.mirror('yz')` was documented as "union of source + reflection" but
// empirically returned only the reflected half in this build, so we
// author the full perimeter directly to avoid relying on it.
// ----------------------------------------------------------------------------

// Wayfarer silhouette. The iconic shape:
//   - Slightly trapezoidal frame (narrower at bottom)
//   - Upper-outer corners that curl up & out into pointed wings
//   - Rounded bottom outer corners
//   - A flat brow line across the top from wing to wing
//
// The bottom-edge taper inward by BOT_INSET on each side gives the
// classic Wayfarer narrow-bottom-wide-top trapezoid look.
const BOT_INSET = 9;   // bottom edge tapers in by this much on each side
const BOT_CORNER_R = 8; // bottom-outer corner radius — generous Wayfarer roundness
const TOP_CORNER_X = 4; // distance the wing peak extends OUTWARD beyond
                        // FRAME_HALF_W at its tip — gives the wing "curl"

// Outer wing tip lives at X = FRAME_HALF_W + TOP_CORNER_X (slightly beyond
// the frame half width), creating the iconic outward wing curl.
const WING_TIP_X = FRAME_HALF_W + TOP_CORNER_X;

const frameSilhouette = path()
  // Start at upper-LEFT wing tip
  .moveTo(-WING_TIP_X, WING_Z_TOP)
  // Down-left-ish to where the side becomes vertical (small inward sweep)
  .sagittaArc(-FRAME_HALF_W, WING_Z_TOP - 4, 1.2)
  // Continue down the left side (vertical)
  .lineTo(-FRAME_HALF_W + BOT_INSET / 2, FRAME_Z_BOT + BOT_CORNER_R)
  // Bottom-left rounded corner
  .sagittaArc(-FRAME_HALF_W + BOT_INSET, FRAME_Z_BOT, 1.5)
  // Flat bottom edge (tapered narrower than the top — trapezoidal)
  .lineTo(FRAME_HALF_W - BOT_INSET, FRAME_Z_BOT)
  // Bottom-right rounded corner
  .sagittaArc(FRAME_HALF_W - BOT_INSET / 2, FRAME_Z_BOT + BOT_CORNER_R, 1.5)
  // Up the right side
  .lineTo(FRAME_HALF_W, WING_Z_TOP - 4)
  // Up-right curl into right wing tip
  .sagittaArc(WING_TIP_X, WING_Z_TOP, 1.2)
  // Flat brow line across the top, from right wing back to left wing.
  .lineTo(-WING_TIP_X, WING_Z_TOP)
  .close();

// Reorient sketch-plane (X,Y) → world (X,Z) so my (x, z) authoring maps to
// the world XZ plane with +Y = up.
// Rotation around +X by +90°:
//   sketch (x, y, z) → world (x, -z, y)
//   sketch +Y (up in my coords) → world +Z (up). ✓
//   sketch extrude axis +Z → world -Y (depth into negative Y).
// After rotation the body spans world Y = -FRAME_DEPTH to 0. Translate
// by (0, +FRAME_DEPTH, 0) so the front face sits at Y=0 (camera-facing).
const body = frameSilhouette
  .extrude(FRAME_DEPTH)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH, 0);

// ----------------------------------------------------------------------------
// Lens openings — two trapezoidal cutouts, one per eye.
// Authored as full sketches (not via reflect) for reliability.
// ----------------------------------------------------------------------------
function lensCutoutSketch(sign: 1 | -1) {
  // sign = +1 for RIGHT lens (positive X), -1 for LEFT lens.
  const innerTopX = sign * LENS_INNER_TOP_X;
  const outerTopX = sign * LENS_OUTER_TOP_X;
  const innerBotX = sign * LENS_INNER_BOT_X;
  const outerBotX = sign * LENS_OUTER_BOT_X;

  // Travel CCW (viewed from +Y, looking back at the camera) around the
  // trapezoid: inner-top → outer-top → outer-bot → inner-bot → back.
  // For a CCW winding the path order depends on sign; both signs traverse
  // the same way in (x, z) space if we keep the same relative direction.
  // We just need it closed; the boolean subtract doesn't care about
  // handedness for a single hole.
  if (sign === 1) {
    // RIGHT lens: traverse inner-top → outer-top → outer-bot → inner-bot
    return path()
      .moveTo(innerTopX + LENS_INNER_TOP_R, LENS_Z_TOP)
      .lineTo(outerTopX - LENS_OUTER_TOP_R, LENS_Z_TOP)
      .tangentArc(outerTopX, LENS_Z_TOP - LENS_OUTER_TOP_R)
      .lineTo(outerBotX, LENS_Z_BOT + LENS_OUTER_BOT_R)
      .tangentArc(outerBotX - LENS_OUTER_BOT_R, LENS_Z_BOT)
      .lineTo(innerBotX + LENS_INNER_BOT_R, LENS_Z_BOT)
      .tangentArc(innerBotX, LENS_Z_BOT + LENS_INNER_BOT_R)
      .lineTo(innerTopX, LENS_Z_TOP - LENS_INNER_TOP_R)
      .tangentArc(innerTopX + LENS_INNER_TOP_R, LENS_Z_TOP)
      .close();
  } else {
    // LEFT lens: traverse the reverse direction in X.
    return path()
      .moveTo(innerTopX - LENS_INNER_TOP_R, LENS_Z_TOP)
      .lineTo(outerTopX + LENS_OUTER_TOP_R, LENS_Z_TOP)
      .tangentArc(outerTopX, LENS_Z_TOP - LENS_OUTER_TOP_R)
      .lineTo(outerBotX, LENS_Z_BOT + LENS_OUTER_BOT_R)
      .tangentArc(outerBotX + LENS_OUTER_BOT_R, LENS_Z_BOT)
      .lineTo(innerBotX - LENS_INNER_BOT_R, LENS_Z_BOT)
      .tangentArc(innerBotX, LENS_Z_BOT + LENS_INNER_BOT_R)
      .lineTo(innerTopX, LENS_Z_TOP - LENS_INNER_TOP_R)
      .tangentArc(innerTopX - LENS_INNER_TOP_R, LENS_Z_TOP)
      .close();
  }
}

// Same orientation transform as the body. Use a slightly oversized depth
// so the cut punches cleanly through the front and back faces.
const rightLensCutout = lensCutoutSketch(1)
  .extrude(FRAME_DEPTH + 6)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 3, 0);

const leftLensCutout = lensCutoutSketch(-1)
  .extrude(FRAME_DEPTH + 6)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 3, 0);

// ----------------------------------------------------------------------------
// Bridge nose notch — small inverted-V cut into the bridge top edge.
// ----------------------------------------------------------------------------
const noseNotch = path()
  .moveTo(-NOSE_NOTCH_W / 2, BRIDGE_TOP_Z + 1)
  .lineTo(NOSE_NOTCH_W / 2, BRIDGE_TOP_Z + 1)
  .lineTo(0, BRIDGE_TOP_Z - NOSE_NOTCH_DEPTH)
  .close()
  .extrude(FRAME_DEPTH + 6)
  .rotate([1, 0, 0], 90)
  .translate(0, FRAME_DEPTH + 3, 0);

// ----------------------------------------------------------------------------
// Camera + LED — on the LEFT lens upper-outer corner (Meta cue).
// Negative X = left side.
// ----------------------------------------------------------------------------
const CAM_X = -(LENS_OUTER_TOP_X) + CAMERA_R + 2;  // slightly inboard from outer edge
const CAM_Z = LENS_Z_TOP + (FRAME_Z_TOP - LENS_Z_TOP) / 2; // mid of top rim

// Camera counterbore — cylinder along Y axis, cut INTO the front face.
const cameraCounterbore = cylinder(CAMERA_DEPTH + 0.5, CAMERA_R, 64)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, -0.25, CAM_Z);

// Camera lens — small dark disc inside the counterbore.
const CAMERA_INNER_R = 2.6;
const cameraLens = cylinder(0.6, CAMERA_INNER_R, 48)
  .alongAxis([0, 1, 0])
  .translate(CAM_X, CAMERA_DEPTH - 0.6, CAM_Z);

// LED — small dot to the right of camera (toward the bridge).
const LED_X = CAM_X + CAMERA_R + 6;
const LED_Z = CAM_Z;
const ledPocket = cylinder(LED_DEPTH + 0.2, LED_R, 32)
  .alongAxis([0, 1, 0])
  .translate(LED_X, -0.1, LED_Z);

// ----------------------------------------------------------------------------
// Compose
// ----------------------------------------------------------------------------
const glasses = body
  .subtract(rightLensCutout)
  .subtract(leftLensCutout)
  .subtract(noseNotch)
  .subtract(cameraCounterbore)
  .subtract(ledPocket)
  .union(cameraLens)
  // Center the assembly so pose-rotation framing sits at origin (the camera
  // fitter looks at (0,0,0) and projects bbox corners; if the model is
  // off-centered the fit is loose and the framing crops).
  .translate(0, -FRAME_DEPTH / 2, 0)
  // Material on the post-union root — empirically in this renderer the
  // static-render path picks up `.material()` from the FINAL chain link,
  // not from the leaf. Use mid-charcoal (NOT pure black) per the docs
  // warning: pure black saturates recess shadows and the lens openings
  // become invisible.
  .material({
    baseColor: '#2a2a2a',
    metalness: 0.0,
    roughness: 0.45,
    clearcoat: 0.1,
    clearcoatRoughness: 0.1,
    ior: 1.5,
  });

return glasses;
