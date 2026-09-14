// Rebuilt from an engineering drawing by drawing_to_cad.
// Source: motor-mount-bracket.pdf, page 1 — front / top / left views, third-angle, scale 1:1, units mm.
// Build: front view silhouette extruded along Y, 3 hole(s).
// Params are named after what they size; every value's evidence (stated
// dimension, symmetry, measured linework, default) is in the ledger.
// Ledger: ./motor-mount-bracket.ledger.json (2 open fact(s))

const width = param('width', 70, { description: 'X span — dimension \'70\' (front view)' });
const leftThickness = param('leftThickness', 5, { description: 'X span — dimension \'5\' (front view)' });
const hole1X = param('hole1X', 45, { description: 'X span — dimension \'45\' (top view)' });
const depth = param('depth', 50, { description: 'Y span — dimension \'50\' (top view)' });
const hole1Y = param('hole1Y', 12, { description: 'Y span — dimension \'12\' (top view)' });
const height = param('height', 45, { description: 'Z span — dimension \'45\' (front view)' });
const bottomThickness = param('bottomThickness', 5, { description: 'Z span — dimension \'5\' (front view)' });
const hole3Z = param('hole3Z', 27, { description: 'Z span — dimension \'27\' (left view)' });
const holeDia1 = param('holeDia1', 5.5, { description: 'hole diameter — callout \'2× ⌀5.5 THRU\'' });
const holeDia2 = param('holeDia2', 12, { description: 'hole diameter — callout \'⌀12 THRU\'' });

let part = path()
  .moveTo(0, 0)
  .lineTo(width, 0)
  .lineTo(width, bottomThickness)
  .lineTo(leftThickness, bottomThickness)
  .lineTo(leftThickness, height)
  .lineTo(0, height)
  .lineTo(0, 0)
  .close()
  .extrude(depth)
  .rotateX(90)
  .translate(0, depth, 0);

part = part.subtract(cylinder(bottomThickness.add(2), holeDia1.divide(2)).translate(hole1X, hole1Y, -1)); // hole1
part = part.subtract(cylinder(bottomThickness.add(2), holeDia1.divide(2)).translate(hole1X, depth.subtract(hole1Y), -1)); // hole2
part = part.subtract(cylinder(leftThickness.add(2), holeDia2.divide(2)).rotateY(90).translate(-1, depth.divide(2), hole3Z)); // hole3

return part;
