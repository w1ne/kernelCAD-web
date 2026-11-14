// SPDX-License-Identifier: CC0-1.0
// Pulley block: a single-sheave rigging block hung from its swivel eye, with
// the hemp purchase line running over the sheave and down both sides.
// What makes it a rigging block rather than a wheel on a stick: two
// teardrop side cheeks bolted through at the axle and at the head, a grooved
// sheave whose rim shows below the cheeks, a hex-nutted axle bolt, a spacer
// bolt through the head, a swivel eye on top, and the rope seated in the
// groove with whipped tails.
// Generic visualization geometry at about real size (0.3 m sheave, 1.05 m to
// the top of the eye with the rope tails reaching the floor), millimetres,
// Z up, cheek face toward -Y, standing on z = 0.

meta({
  name: "pulley-block",
  license: 'CC0-1.0',
  title: "Pulley block",
  description: "Single-sheave rigging block at about real size: teardrop steel side cheeks, grooved sheave showing below the cheeks, hex-nutted axle bolt, head spacer bolt, swivel eye, and a hemp purchase line seated over the sheave with whipped tails. Material controls: cheek plates, sheave, bolts and swivel, rope. houseShow, touring and blackWrap presets.",
  tags: ['pulley block', 'rigging block', 'sheave', 'loft block', 'hemp rigging', 'theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 4000,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const cheek = param('cheek', '#2f6fb0', { label: 'Cheek plates' });
const sheave = param('sheave', '#c3c9cb', { label: 'Sheave' });
const hardware = param('hardware', '#8d969b', { label: 'Bolts, nuts and swivel' });
const rope = param('rope', '#c9a466', { label: 'Purchase line' });

presets({
  houseShow: { cheek: '#2f6fb0', sheave: '#c3c9cb', hardware: '#8d969b', rope: '#c9a466' },
  touring: { cheek: '#e2a21c', sheave: '#2c3033', hardware: '#b9c0c3', rope: '#e8e2d2' },
  blackWrap: { cheek: '#24282b', sheave: '#9aa3a7', hardware: '#5d656a', rope: '#3b3f42' },
});

const WHIPPING = '#2a2a28';

const p = assembly("pulley-block");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));

const AX = 600; // axle height
const R = 150; // sheave rim radius
const RG = 136; // groove bottom / rope centreline
const HZ = AX + 250; // head bolt height

// (x, z) outline extruded `t` thick and centred on y = 0.
const sideProfile = (pts, t) => extrudePolygon(pts, t).rotateX(90).translate(0, t / 2, 0);
const turned = (pts) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};

// Teardrop cheek: arc round the axle through the bottom, arc round the head.
const cheekPts = [];
for (let a = 150; a <= 390; a += 20) {
  const t = (a * Math.PI) / 180;
  cheekPts.push([118 * Math.cos(t), AX + 118 * Math.sin(t)]);
}
for (let a = 10; a <= 170; a += 32) {
  const t = (a * Math.PI) / 180;
  cheekPts.push([52 * Math.cos(t), HZ + 52 * Math.sin(t)]);
}
for (const [s, y] of [["front", -38], ["back", 38]] as [string, number][])
  add(`cheek-${s}`, sideProfile(cheekPts, 12).translate(0, y, 0).color(cheek));

// Grooved sheave on the axle, axis along Y.
const sheaveShape = turned([[34, -24], [R, -24], [R, -17], [RG - 8, -7], [RG - 8, 7], [R, 17], [R, 24], [34, 24]]);
add("sheave", sheaveShape.rotateX(90).translate(0, 0, AX).color(sheave));

// Axle bolt with hex nut each side; head spacer bolt.
add("axle", cylinder(124, 20, 16).rotateX(90).translate(0, 62, AX).color(hardware));
add("axle-nut-front", cylinder(14, 34, 6).rotateX(90).translate(0, -44, AX).color(hardware));
add("axle-nut-back", cylinder(14, 34, 6).rotateX(90).translate(0, 58, AX).color(hardware));
add("head-bolt", cylinder(110, 16, 12).rotateX(90).translate(0, 55, HZ).color(hardware));
add("head-nut", cylinder(12, 28, 6).rotateX(90).translate(0, -44, HZ).color(hardware));
add("head-spacer", cylinder(64, 30, 16).rotateX(90).translate(0, 32, HZ).color(hardware));

// Swivel eye on top of the head.
add("swivel-collar", turned([[0, 0], [26, 0], [26, 18], [18, 30], [0, 30]]).translate(0, 0, HZ + 50).color(hardware));
add("swivel-stem", cylinder(40, 12, 12).translate(0, 0, HZ + 78).color(hardware));
add("swivel-eye", torus(42, 11, 18).rotateX(90).translate(0, 0, HZ + 160).color(hardware));

// Purchase line: seated over the top of the sheave, tails down to the floor.
add("rope-over", torus(RG, 14, 24).rotateX(90).subtract(box(400, 40, 200, true).translate(0, 0, -100)).translate(0, 0, AX).color(rope));
for (const [s, x] of [["onstage", -RG], ["offstage", RG]] as [string, number][]) {
  add(`rope-${s}`, cylinder(AX, 14, 12).translate(x, 0, 0).color(rope));
  add(`whipping-${s}`, cylinder(40, 15.5, 12).translate(x, 0, 24).color(WHIPPING));
}

return p.model();
