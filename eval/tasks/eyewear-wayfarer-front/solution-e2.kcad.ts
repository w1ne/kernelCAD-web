// Minimal-API ablation build: Ray-Ban Meta Wayfarer front face.
// Built from primitives + path() sketches + booleans only.
// Coords during construction: X=horizontal, Y=vertical (height), extrude in +Z.
// After building, rotate +90° about X so the silhouette stands Z-up and the
// front face (originally z=0) lands at minimum Y for the renderer.

const frameWidth = 150;       // total horizontal envelope (mm)
const frameHeight = 50;       // vertical envelope (mm)
const frameDepth = 10;        // out-of-plane thickness (front-to-back) (mm)
const lensHalfWidth = 26;     // lens opening half-width
const lensHeight = 36;        // lens opening height
const bridgeGap = 16;         // inter-lens distance
const lensCornerRadius = 6;   // rounded corners on lens openings
const cornerOuterRadius = 10; // wayfarer outer-top "wing" radius
const cornerBottomRadius = 14;// gentler bottom curve

// ----- Outer silhouette path (in XY, will extrude in +Z) -----
// Lay out as a closed loop with arcs for wayfarer corner shaping.
// Start bottom-left, walk counter-clockwise.

const halfW = frameWidth / 2;     // 75
const baseY = 0;                  // bottom of frame
const topY = frameHeight;         // top of frame (50)

// Wayfarer outer corner key points
//
// bottom-outer (left): x = -halfW + bottomCornerR, y = 0
// bottom-inner sweep gently to mirror under bridge
// top-outer "wing" sweeps up and outward
//
// We approximate the upper outline as: straight top edge between the two
// outer-top wings, with sagitta-arc wings angling outward+down to the side
// of the frame. Bottom edge is a single gentle sagitta-arc bow.

const outerSilhouette = path()
  // start: bottom-left corner area, arc up the left side
  .moveTo(-halfW + cornerBottomRadius, baseY)
  // bottom gentle arc to the right
  .sagittaArc(halfW - cornerBottomRadius, baseY, -3)        // sag negative = bows down a bit
  // bottom-right corner up
  .tangentArc(halfW, baseY + cornerBottomRadius)
  // up the right side
  .lineTo(halfW, topY - cornerOuterRadius)
  // wayfarer wing — top-right corner curving up & outward
  .tangentArc(halfW - cornerOuterRadius, topY)
  // top edge — gentle bow upward across the bridge
  .sagittaArc(-(halfW - cornerOuterRadius), topY, 2)        // small upward bulge
  // wayfarer wing — top-left corner
  .tangentArc(-halfW, topY - cornerOuterRadius)
  // down the left side
  .lineTo(-halfW, baseY + cornerBottomRadius)
  // bottom-left corner
  .tangentArc(-halfW + cornerBottomRadius, baseY)
  .close();

const frameSlab = outerSilhouette.extrude(frameDepth);

// ----- Lens opening (one) -----
// Trapezoidal with rounded corners: top wider than bottom (wayfarer taper).
// Lens center at lensCenterX (positive = right lens).
const lensCenterY = baseY + 7 + lensHeight / 2;   // raise above bottom edge

function lensOpening(cx: number): import('../../../src/modeling/capture/proxy').Shape {
  // 4 corners (trapezoid taper: top wider by 4mm than bottom)
  const halfTop = lensHalfWidth;
  const halfBot = lensHalfWidth - 2;
  const halfH = lensHeight / 2;
  const topY = lensCenterY + halfH;
  const botY = lensCenterY - halfH;
  const r = lensCornerRadius;

  // Counter-clockwise loop, starting at bottom-left straight segment start.
  const p = path()
    .moveTo(cx - halfBot + r, botY)
    .lineTo(cx + halfBot - r, botY)
    .tangentArc(cx + halfBot, botY + r)
    .lineTo(cx + halfTop, topY - r)
    .tangentArc(cx + halfTop - r, topY)
    .lineTo(cx - halfTop + r, topY)
    .tangentArc(cx - halfTop, topY - r)
    .lineTo(cx - halfBot, botY + r)
    .tangentArc(cx - halfBot + r, botY)
    .close();

  // Extrude deeper than frame and bury Z so it cuts through cleanly.
  return p.extrude(frameDepth + 4).translate(0, 0, -2);
}

const rightLensX = bridgeGap / 2 + lensHalfWidth;   // 8 + 26 = 34
const leftLensX = -rightLensX;

const lensCutR = lensOpening(rightLensX);
const lensCutL = lensOpening(leftLensX);

// ----- Bridge nose-notch -----
// A small downward U cut from the bottom of the bridge.
const noseNotchW = 10;
const noseNotchDepth = 6;
const noseNotchY = baseY + 7 + 10;   // sits low on the bridge

const noseNotch = path()
  .moveTo(-noseNotchW / 2, noseNotchY - noseNotchDepth)
  .lineTo(noseNotchW / 2, noseNotchY - noseNotchDepth)
  .sagittaArc(-noseNotchW / 2, noseNotchY - noseNotchDepth, 3) // small bulge bottom
  .close();

const noseNotchSolid = noseNotch.extrude(frameDepth + 4).translate(0, 0, -2);

// ----- Camera + LED (LEFT side only — asymmetric) -----
// Camera: ~8mm circular recess at the upper-outer corner of the LEFT lens
// opening. "Left" in the wearer's frame = camera-relative right.
// We anchor camera at outer-top corner of the left-lens slot.
const cameraR = 4;            // 8mm dia
const cameraDepth = 3;        // recessed depth
const cameraX = leftLensX - lensHalfWidth + 4;    // tucked just inside the outer wing
const cameraY = lensCenterY + lensHeight / 2 - 4; // near top edge of lens slot
// Cylinder axis is Z, so it punches through the front face after rotation. Good.
const cameraCut = cylinder(cameraDepth + 0.5, cameraR).translate(cameraX, cameraY, -0.25);

// LED: tiny dot between the camera and the bridge, on the rim at top of frame.
const ledR = 0.8;             // 1.6mm dia
const ledDepth = 1.5;
const ledX = (cameraX + 0) / 2;   // halfway between camera and centerline
const ledY = topY - 3;            // near top rim of frame
const ledCut = cylinder(ledDepth + 0.5, ledR).translate(ledX, ledY, -0.25);

// ----- Compose -----
let frameBody = frameSlab
  .subtract(lensCutL)
  .subtract(lensCutR)
  .subtract(noseNotchSolid)
  .subtract(cameraCut)
  .subtract(ledCut);

// Color: glossy black acetate (matte-ish black for Meta Wayfarer)
frameBody = frameBody.color('#0a0a0a');

// Reorient: rotate +90° about X so the silhouette stands upright (Z-up)
// and the front face (originally min-Z) lands at min-Y for the front render.
return frameBody.rotate([1, 0, 0], 90);
