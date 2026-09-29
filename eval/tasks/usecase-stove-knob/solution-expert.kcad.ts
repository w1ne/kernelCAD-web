// U5: Replacement stove knob. FINAL (verified against live server).
const knobDia = param('knobDia', 35);
const knobHeight = param('knobHeight', 20);
const shaftDia = param('shaftDia', 6);
const flatHeight = param('flatHeight', 4.5);
const shaftDepth = param('shaftDepth', 12);
const boreClearance = param('boreClearance', 0.2);

const boreDia = shaftDia.add(boreClearance);
const boreFlatHeight = flatHeight.add(boreClearance);
const boreR = boreDia.divide(2);
const flatOffsetFromCenter = boreFlatHeight.subtract(boreR);

const knobR = knobDia.divide(2);

let knob = cylinder(knobHeight, knobR);

// D-shaped void = round bore MINUS the segment above the flat plane
// (NOT bore.subtract(x) then knob.subtract(x) separately -- that unions
// the two removed regions and over-cuts, see U5 write-up).
const bore = cylinder(shaftDepth.add(1), boreR).translate(0, 0, -0.5);
const flatCut = box(boreR.multiply(2).add(2), boreR.multiply(2).add(2), shaftDepth.add(2))
  .translate(boreR.add(1).negate(), flatOffsetFromCenter, -1);
const dVoid = bore.subtract(flatCut);
knob = knob.subtract(dVoid);

const knurlBandHeight = knobHeight.subtract(6);
const ridgeCount = 36;
const ridge = box(1.2, 1.6, knurlBandHeight, true).translate(knobR.subtract(0.3), 0, knurlBandHeight.divide(2).add(3));
knob = knob.union(ridge.patternCircular({ count: ridgeCount, axis: [0, 0, 1] }));

const pointer = box(3, knobR.subtract(1), 1, false).translate(-1.5, 0, knobHeight);
knob = knob.union(pointer);

knob = knob.finish('pla');

dfmSpec({ minWall: 1.2, process: 'fdm' });

return knob;
