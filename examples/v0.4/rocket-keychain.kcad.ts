// v0.4 hero artifact: flat rocket keychain converted from an internet image.
//
// Source reference:
// - "Rocket with boosters icon.svg" by Kim Holder / Briligg, Wikimedia Commons
// - CC0 1.0 Universal Public Domain Dedication
// - https://commons.wikimedia.org/wiki/File:Rocket_with_boosters_icon.svg
//
// The CC0 booster-rocket silhouette is converted into the solved numeric sketch
// below, then adapted as a printable keychain with the v0.4 constraint story:
// - the hull and fins are symmetric about the Y axis
// - the nose shoulders join the body with tangent arc segments
// - the porthole circles are concentric
// - the fin leading edges use the solved -32 degree angle
// - body stations are dimensioned as literal Y coordinates
//
// Current runtime params are symbolic ParamRefs. This demo intentionally keeps
// dependent geometry literal so no script expression performs ParamRef math.

const thickness = 3;
const topZ = 3;
// Solved constraint dimensions:
// axis_bottom=(0,-55), axis_top=(0,70)
// nose=(0,58), shoulders=(+/-18,34), booster sides=(+/-30,-6)
// fin roots=(+/-22,-22), fin tips=(+/-54.2,-42.1), tail notch=(0,-55)
// porthole center=(0,24), 46 mm below axis_top
const rocketOutline = path()
  .moveTo(-54.2, -42.1)
  .lineTo(-22, -22)
  .label('leftFinAngle')
  .lineTo(-30, -6)
  .lineTo(-18, 34)
  .label('leftBoosterShoulder')
  .tangentArc(0, 58)
  .label('leftTangentNoseArc')
  .tangentArc(18, 34)
  .label('rightTangentNoseArc')
  .lineTo(30, -6)
  .lineTo(22, -22)
  .label('rightBoosterShoulder')
  .lineTo(54.2, -42.1)
  .label('rightFinAngle')
  .lineTo(20, -42.1)
  .lineTo(14, -50)
  .lineTo(8, -42.1)
  .lineTo(0, -55)
  .lineTo(-8, -42.1)
  .lineTo(-14, -50)
  .lineTo(-20, -42.1)
  .close();

const body = rocketOutline.extrude(thickness);

// Concentric porthole rings: a broad raised ring, a smaller raised lip, and the
// through opening all share center (0, 24).
const portholeOpening = cylinder(8, 5.5)
  .translate(0, 24, -1);
const outerPortholeRing = cylinder(1.2, 10)
  .subtract(cylinder(3.2, 7.2).translate(0, 0, -1))
  .translate(0, 24, topZ);
const innerPortholeLip = cylinder(1.6, 6.8)
  .subtract(cylinder(3.6, 5.5).translate(0, 0, -1))
  .translate(0, 24, topZ);

// The keyring hole uses a literal radius because its position and scale are
// part of the solved sketch story, not an independent runtime expression.
const keyringHole = cylinder(8, 2.8)
  .translate(0, 48, -1);

return body
  .subtract(portholeOpening)
  .subtract(keyringHole)
  .union(outerPortholeRing, innerPortholeLip);
