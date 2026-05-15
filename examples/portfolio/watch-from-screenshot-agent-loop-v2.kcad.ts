// Real Object Brief
// Artifact: a round dress wristwatch reconstructed from the reference screenshot
// /home/andrii/Pictures/Screenshots/Screenshot_2026-05-14_16-52-47.png.
// Scale: millimeters, roughly a 42 mm case with a 22 mm brown leather strap.
// Visible facts: polished silver round case, slim bezel, white dial, large black
// numerals, minute ticks, TIMEWEAR and SL-68/MOVEMENT dial printing, black hour
// and minute hands, red seconds hand, right-side ridged crown, brown
// crocodile-pattern strap with tan stitching.
// Hidden-side inference: the watch has a real case-band depth, case back,
// front bezel, rehaut/crystal retaining lip, dial plate, movement pocket,
// soldered/brazed lugs, spring bars captured in lug sockets, and folded leather
// strap loops bearing around the spring bars before continuing into strap halves.
// Validation focus: front legibility, right/top/iso physical depth, no floating
// strap pieces, no buried spring bars, and an unobstructed dial stack.

const caseRadius = 42;
const dialRadius = 35.5;
const frontY = -6.4;
const strapWidth = 22;
const springBarZ = 48.8;
const lugX = 15.2;

function cylY(depth, radius, y = 0, segments = 96) {
  return cylinder(depth, radius, segments)
    .alongAxis([0, 1, 0])
    .translate(0, y - depth / 2, 0);
}

function cylX(length, radius, x = 0, segments = 48) {
  return cylinder(length, radius, segments)
    .alongAxis([1, 0, 0])
    .translate(x - length / 2, 0, 0);
}

function ringY(depth, outerRadius, innerRadius, y, color, segments = 128) {
  return cylY(depth, outerRadius, y, segments)
    .subtract(cylY(depth + 1.2, innerRadius, y, segments))
    .color(color);
}

function faceBox(width, height, depth, x, z, y, color) {
  return box(width, depth, height, true)
    .translate(x, y, z)
    .color(color);
}

function faceText(value, size, x, z, y, color) {
  return sketch.text(value, {
    size,
    align: 'center',
    position: [0, 0],
  })
    .extrude(0.34)
    .rotate([1, 0, 0], 90)
    .translate(x, y, z - size * 0.36)
    .color(color);
}

function radialPoint(radius, degFrom12) {
  const rad = (degFrom12 * Math.PI) / 180;
  return [Math.sin(rad) * radius, Math.cos(rad) * radius];
}

function radialTick(index) {
  const deg = index * 6;
  const major = index % 5 === 0;
  const [x, z] = radialPoint(major ? 33.8 : 34.6, deg);
  return faceBox(major ? 0.75 : 0.35, major ? 3.6 : 1.85, 0.42, x, z, frontY - 0.36, '#111111')
    .rotate([0, 1, 0], deg);
}

function hand(name, length, width, degFrom12, y, color, tail = 0) {
  const forward = faceBox(width, length, 0.62, 0, length / 2, y, color)
    .rotate([0, 1, 0], degFrom12);
  if (tail <= 0) return { name, shape: forward };
  const back = faceBox(width * 0.72, tail, 0.58, 0, -tail / 2, y, color)
    .rotate([0, 1, 0], degFrom12);
  return { name, shape: forward.union(back).color(color) };
}

function leatherPanel(z, upper) {
  const sign = upper ? 1 : -1;
  return box(strapWidth - 2.6, 1.0, 12.5, true)
    .translate(0, -8.7, z + sign * 0.5)
    .color('#944824');
}

function stitch(x, z, tilt) {
  return box(0.9, 0.75, 5.8, true)
    .rotate([0, 1, 0], tilt)
    .translate(x, -9.1, z)
    .color('#d48a55');
}

function lugShape(x, z, upper, left) {
  const s = upper ? 1 : -1;
  const lean = (left ? -8 : 8) * s;
  const rootPad = cylY(3.1, 5.2, -1.15, 48)
    .scale([0.78, 1, 0.52])
    .translate(x, 0, z - s * 5.4);
  const ear = box(3.2, 5.6, 7.4, true)
    .rotate([0, 1, 0], lean)
    .translate(x, -3.35, z + s * 0.2);
  const roundedSocket = cylX(3.6, 1.9, x, 40)
    .translate(0, -3.55, z + s * 2.8);
  return rootPad.union(ear, roundedSocket).color('#dbe0e4');
}

function strapSleeveShape(z, upper) {
  const s = upper ? 1 : -1;
  const loop = cylX(strapWidth + 2.0, 4.6, 0, 64)
    .translate(0, -4.45, z)
    .subtract(cylX(strapWidth + 3.0, 1.7, 0, 48).translate(0, -4.45, z));
  const frontTab = box(strapWidth + 0.8, 1.4, 10.2, true).translate(0, -7.25, z + s * 5.2);
  const rearFold = box(strapWidth + 0.8, 1.3, 9.8, true).translate(0, -1.75, z + s * 5.0);
  const exitTongue = box(strapWidth, 4.8, 9.8, true).translate(0, -6.4, z + s * 8.9);
  const foldSeam = box(strapWidth - 2.8, 0.65, 1.0, true).translate(0, -8.0, z + s * 8.5);
  return loop.union(frontTab, rearFold, exitTongue, foldSeam).color('#7e351b');
}

function strapBodyShape(centerZ) {
  return box(strapWidth, 4.6, 118, true)
    .translate(0, -6.6, centerZ)
    .color('#853b1f');
}

const watch = assembly('screenshot dress watch with lug-mounted leather strap');

const caseBand = watch.part(
  'deep polished case band with movement cavity',
  ringY(9.2, caseRadius, 36.8, -0.2, '#cdd2d6'),
);
const caseBack = watch.part(
  'slightly proud stainless case back',
  cylY(1.5, 37.6, 4.85, 128).color('#aeb5bc'),
);
const bezel = watch.part(
  'front polished bezel retaining dial and crystal edge',
  ringY(1.7, 42.8, 37.1, -5.15, '#e7eaec'),
);
const rehaut = watch.part(
  'thin inner rehaut ring clear of numerals',
  ringY(0.9, 37.1, 35.8, -5.95, '#d5d9dd'),
);
const crystalEdge = watch.part(
  'clear crystal visible as raised perimeter edge',
  ringY(0.55, 36.3, 34.6, -6.78, '#dfeef6'),
);
const dial = watch.part(
  'white dial plate recessed under rehaut',
  cylY(0.8, dialRadius, frontY + 0.12, 128).color('#fffdf8'),
);
const movementPocket = watch.part(
  'rear movement pocket visible in side depth',
  cylY(2.1, 30.5, 2.75, 96).color('#9098a0'),
);

watch.fixed('case back screwed into case band', caseBand, caseBack, { origin: [0, 4.2, 0] });
watch.fixed('bezel crimped onto case band', caseBand, bezel, { origin: [0, -5.1, 0] });
watch.fixed('rehaut seated inside bezel', bezel, rehaut, { origin: [0, -5.9, 0] });
watch.fixed('crystal edge captured by bezel lip', bezel, crystalEdge, { origin: [0, -6.8, 0] });
watch.fixed('dial plate supported by case shoulder', caseBand, dial, { origin: [0, frontY, 0] });
watch.fixed('movement pocket under case back', caseBack, movementPocket, { origin: [0, 3, 0] });

const upperLugLeft = watch.part('upper left compact lug ear grown from case band', lugShape(-lugX, springBarZ, true, true));
const upperLugRight = watch.part('upper right compact lug ear grown from case band', lugShape(lugX, springBarZ, true, false));
const lowerLugLeft = watch.part('lower left compact lug ear grown from case band', lugShape(-lugX, -springBarZ, false, true));
const lowerLugRight = watch.part('lower right compact lug ear grown from case band', lugShape(lugX, -springBarZ, false, false));

for (const lug of [upperLugLeft, upperLugRight, lowerLugLeft, lowerLugRight]) {
  watch.fixed('lug foot brazed into main case body', caseBand, lug, { origin: [0, -1.2, 35] });
}

const upperSpringBar = watch.part(
  'upper spring bar core hidden inside leather sleeve',
  cylX(strapWidth + 2.4, 0.9, 0, 48).translate(0, -4.45, springBarZ).color('shaft'),
);
const lowerSpringBar = watch.part(
  'lower spring bar core hidden inside leather sleeve',
  cylX(strapWidth + 2.4, 0.9, 0, 48).translate(0, -4.45, -springBarZ).color('shaft'),
);
watch.fixed('upper spring bar captured inside leather loop between lug ears', upperLugLeft, upperSpringBar, { origin: [0, -4.45, springBarZ] });
watch.fixed('lower spring bar captured inside leather loop between lug ears', lowerLugLeft, lowerSpringBar, { origin: [0, -4.45, -springBarZ] });

for (const [name, z, x] of [
  ['upper left seated spring bar end cap', springBarZ, -12.6],
  ['upper right seated spring bar end cap', springBarZ, 12.6],
  ['lower left seated spring bar end cap', -springBarZ, -12.6],
  ['lower right seated spring bar end cap', -springBarZ, 12.6],
]) {
  const cap = watch.part(name, cylX(1.2, 1.15, x, 32).translate(0, -4.45, z).color('#dce1e5'));
  watch.fixed('spring bar end cap seated inside lug ear with clearance', caseBand, cap, { origin: [x, -4.45, z] });
}

const upperFold = watch.part(
  'upper folded leather sleeve surrounding spring bar',
  strapSleeveShape(springBarZ, true),
);
const lowerFold = watch.part(
  'lower folded leather sleeve surrounding spring bar',
  strapSleeveShape(-springBarZ, false),
);
watch.fixed('upper leather loop bears continuously on upper spring bar', upperSpringBar, upperFold, { origin: [0, -4.8, springBarZ] });
watch.fixed('lower leather loop bears continuously on lower spring bar', lowerSpringBar, lowerFold, { origin: [0, -4.8, -springBarZ] });

const upperStrap = watch.part(
  'upper continuous brown leather strap half stitched to folded sleeve',
  strapBodyShape(110.5),
);
const lowerStrap = watch.part(
  'lower continuous brown leather strap half stitched to folded sleeve',
  strapBodyShape(-110.5),
);
watch.fixed('upper folded loop stitched into strap body with no vertical gap', upperFold, upperStrap, { origin: [0, -6, 55] });
watch.fixed('lower folded loop stitched into strap body with no vertical gap', lowerFold, lowerStrap, { origin: [0, -6, -55] });

for (const z of [62, 80, 98, 116, 134, 152]) {
  const panel = watch.part(`upper raised crocodile leather panel ${z}`, leatherPanel(z, true));
  watch.fixed('embossed upper leather panel bonded to strap', upperStrap, panel, { origin: [0, -8.5, z] });
}
for (const z of [-62, -80, -98, -116, -134, -152]) {
  const panel = watch.part(`lower raised crocodile leather panel ${z}`, leatherPanel(z, false));
  watch.fixed('embossed lower leather panel bonded to strap', lowerStrap, panel, { origin: [0, -8.5, z] });
}
for (const z of [64, 76, 88, 100, 112, 124, 136, 148, -64, -76, -88, -100, -112, -124, -136, -148]) {
  const owner = z > 0 ? upperStrap : lowerStrap;
  const left = watch.part(`left tan stitch at ${z}`, stitch(-8.8, z, -7));
  const right = watch.part(`right tan stitch at ${z}`, stitch(8.8, z, 7));
  watch.fixed('tan stitching sewn into leather edge', owner, left, { origin: [-8.8, -9, z] });
  watch.fixed('tan stitching sewn into leather edge', owner, right, { origin: [8.8, -9, z] });
}
const upperGroove = watch.part('upper central leather groove', box(1.0, 0.8, 104, true).translate(0, -9.35, 110).color('#3b1a0f'));
const lowerGroove = watch.part('lower central leather groove', box(1.0, 0.8, 104, true).translate(0, -9.35, -110).color('#3b1a0f'));
watch.fixed('upper groove recessed into strap surface', upperStrap, upperGroove, { origin: [0, -9, 98] });
watch.fixed('lower groove recessed into strap surface', lowerStrap, lowerGroove, { origin: [0, -9, -98] });

const crownStem = watch.part('crown stem through case tube', cylX(7, 1.45, caseRadius - 1, 40).translate(0, -0.3, 0).color('shaft'));
const crown = watch.part('ridged pull crown on right side', cylX(7.6, 4.0, caseRadius + 5.5, 48).translate(0, -0.3, 0).color('#cdd3d8'));
watch.fixed('crown stem passes through main case tube', caseBand, crownStem, { origin: [caseRadius, -0.3, 0] });
watch.fixed('crown knob fixed to external stem', crownStem, crown, { origin: [caseRadius + 5, -0.3, 0] });
for (const dx of [-2.6, -1.3, 0, 1.3, 2.6]) {
  const ridge = watch.part(`crown grip ridge ${dx}`, cylX(0.32, 4.45, caseRadius + 5.5 + dx, 36).translate(0, -0.3, 0).color('#eef1f4'));
  watch.fixed('machined crown ridge on crown body', crown, ridge, { origin: [caseRadius + 5.5 + dx, -0.3, 0] });
}

for (let i = 0; i < 60; i += 1) {
  const tick = watch.part(`dial ${i % 5 === 0 ? 'hour' : 'minute'} tick ${i}`, radialTick(i));
  watch.fixed('printed minute tick bonded to visible dial', dial, tick, { origin: [0, frontY, 0] });
}

const numeralSpecs = [
  ['12', 0, 12.8, 27.2],
  ['1', 30, 9.4, 28.4],
  ['2', 60, 9.9, 29.2],
  ['3', 90, 10.5, 30.4],
  ['4', 120, 9.9, 30.0],
  ['5', 150, 9.7, 29.2],
  ['6', 180, 12.6, 27.0],
  ['7', 210, 9.7, 29.2],
  ['8', 240, 9.9, 30.0],
  ['9', 270, 10.5, 30.4],
  ['10', 300, 9.1, 28.9],
  ['11', 330, 9.1, 28.9],
];
for (const [value, deg, size, radius] of numeralSpecs) {
  const [x, z] = radialPoint(radius, deg);
  const numeral = watch.part(`legible printed numeral ${value}`, faceText(value, size, x, z, frontY - 0.72, '#111111'));
  watch.fixed('raised black numeral printed inside clear dial aperture', dial, numeral, { origin: [x, frontY, z] });
}

for (const [value, size, x, z] of [
  ['TIMEWEAR', 4.4, 0, 8.2],
  ['SL-68', 3.3, 0, -15.2],
  ['MOVEMENT', 3.3, 0, -19.4],
]) {
  const label = watch.part(`dial printing ${value}`, faceText(value, size, x, z, frontY - 0.76, '#333333'));
  watch.fixed('small dial text printed below crystal and unobstructed', dial, label, { origin: [x, frontY, z] });
}

for (const spec of [
  hand('short black hour hand pointing near ten', 23.0, 2.6, -55, frontY - 1.12, '#171717', 3.5),
  hand('long black minute hand pointing near two', 31.0, 2.0, 52, frontY - 1.22, '#171717', 4.2),
  hand('red seconds hand pointing near seven', 33.0, 1.05, 210, frontY - 1.38, '#ef382d', 8.0),
]) {
  const part = watch.part(spec.name, spec.shape);
  watch.fixed('hand stack centered on cannon pinion', dial, part, { origin: [0, frontY, 0] });
}
const pinion = watch.part('stacked central cannon pinion and seconds cap', cylY(1.1, 2.25, frontY - 1.58, 48).color('#111111'));
const redCap = watch.part('red seconds hand hub cap', cylY(0.5, 1.2, frontY - 2.15, 40).color('#ef382d'));
watch.fixed('pinion emerges through dial center', dial, pinion, { origin: [0, frontY, 0] });
watch.fixed('red seconds cap fastened to pinion', pinion, redCap, { origin: [0, frontY - 2, 0] });

return watch.model();
