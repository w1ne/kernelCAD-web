// SPDX-License-Identifier: CC0-1.0
// Inbound camera mast: the number-plate recognition (ANPR) mast that reads
// every vehicle arriving at a recovery site's weighbridge. What makes it a
// camera mast rather than a post: a tapered galvanised pole on a bolted
// base plate and concrete pad, a hinged service door near the foot, an
// outreach arm at the top carrying two long camera housings with sun
// shields and infrared illuminators aimed down the lane, an overview dome
// camera under the arm, a junction box, and a CCTV warning sign.
// Generic visualization geometry at about real size (4.2 m pole, 1.4 m
// arm), millimetres, Z up, cameras look along -Y toward approaching trucks.

meta({
  name: "inbound-camera-mast",
  license: 'CC0-1.0',
  title: "Inbound camera mast",
  description: "ANPR number-plate camera mast at about real size: tapered galvanised pole on bolted base plate and concrete pad, service door, outreach arm with two camera housings, sun shields and infrared illuminators, overview dome camera, junction box and CCTV warning sign. Material controls: pole, camera housings, concrete pad and sign. Arm style (single or twin camera). galvanised, blackPowderCoat and weathered presets.",
  tags: ['camera', 'cctv', 'anpr', 'number plate recognition', 'camera mast', 'surveillance', 'weighbridge', 'reception', 'recycling', 'materials recovery', 'waste management', 'low poly', 'scene prop'],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 2400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pole = param('pole', '#a7aeb0', { label: 'Pole and arm (galvanised)' });
const housing = param('housing', '#ecebe6', { label: 'Camera housings' });
const concrete = param('concrete', '#8f918b', { label: 'Concrete pad' });
const sign = param('sign', '#f2d21c', { label: 'CCTV sign' });
const cameras = param('cameras', 'twin', { choices: ['single', 'twin'], label: 'Camera count' });

presets({
  galvanised: { pole: '#a7aeb0', housing: '#ecebe6', concrete: '#8f918b', sign: '#f2d21c' },
  blackPowderCoat: { pole: '#2b2e31', housing: '#3a3d40', concrete: '#8f918b', sign: '#f2d21c' },
  weathered: { pole: '#8b8a82', housing: '#c9c5b8', concrete: '#77746a', sign: '#c9ac3a' },
});

const p = assembly("inbound-camera-mast");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);

// Concrete pad and bolted base plate with gussets.
add("pad", blk(0, 0, 0, 700, 700, 150).color(concrete));
add("base-plate", blk(0, 0, 150, 420, 420, 25).color(pole));
for (const [x, y] of [[-160, -160], [160, -160], [-160, 160], [160, 160]]) {
  add(`anchor-bolt-${x}-${y}`, cylinder(60, 14, 8).translate(x, y, 175).color('#4a4c4e'));
  add(`anchor-nut-${x}-${y}`, cylinder(22, 26, 6).translate(x, y, 175).color('#4a4c4e'));
}
for (let k = 0; k < 4; k++) add(`gusset-${k}`, extrudePolygon([[0, 0], [120, 0], [0, 200]], 12).rotateX(90).translate(80, 6, 175).rotateZ(45 + k * 90).color(pole));

// Tapered pole: lofted octagon from 180 mm to 110 mm across.
const PZ = 175;
const PH = 4200;
const ngon = (r: number, z: number) => {
  let pb = path().moveTo(r, 0);
  for (let k = 1; k < 12; k++) pb = pb.lineTo(r * Math.cos((k * Math.PI) / 6), r * Math.sin((k * Math.PI) / 6));
  return { prof: pb.close(), z };
};
const rings = [ngon(90, PZ), ngon(55, PZ + PH)];
add("pole", rings[0].prof.loft([rings[1].prof], {
  planes: rings.map((r) => ({ plane: 'XY' as const, origin: [0, 0, r.z] as [number, number, number] })),
  ruled: true,
}).color(pole));
add("pole-cap", sphere(58).scale(1, 1, 0.5).translate(0, 0, PZ + PH).color(pole));
// Service door at the foot, facing the camera side.
add("service-door", blk(0, -86, PZ + 450, 110, 12, 420).rotateZ(-30).color(pole));
add("door-lock", cylinder(16, 12, 8).rotateX(90).translate(0, -92, PZ + 660).rotateZ(-30).color('#4a4c4e'));

// Outreach arm toward -Y with a diagonal brace.
const AZ = PZ + PH - 250;
const AL = 1400;
add("arm-clamp", cylinder(180, 72, 12).translate(0, 0, AZ - 90).color(pole));
add("arm", cylinder(AL, 40, 12).rotateX(90).translate(0, 0, AZ).color(pole));
add("arm-brace", cylinder(875, 24, 8).rotateX(59).translate(0, 0, AZ - 450).color(pole));
add("arm-end-cap", cylinder(14, 44, 12).rotateX(90).translate(0, -AL, AZ).color('#4a4c4e'));

// Camera housing hung under the arm: body, sun shield, glass, IR lamp.
const camera = (tag: string, x: number, y: number) => {
  const z = AZ - 60;
  add(`${tag}-bracket`, blk(x, y, z, 60, 80, 60).color(pole));
  add(`${tag}-tilt`, blk(x, y, z - 50, 40, 60, 60).color(pole));
  const tilt = (s: Shape) => s.rotateX(-12).translate(x, y, z - 140);
  add(`${tag}-body`, tilt(extrudeRoundedRect(130, 120, 30, 480, { axis: 'y' }).translate(0, -240, 0)).color(housing));
  add(`${tag}-shield`, tilt(blk(0, -60, 64, 170, 600, 14)).color(housing));
  add(`${tag}-glass`, tilt(blk(0, -484, -10, 100, 8, 84)).color('#1d2a33'));
  add(`${tag}-ir-lamp`, tilt(cylinder(40, 34, 12).rotateX(90).translate(0, -480, -70)).color('#7a1c1c'));
  add(`${tag}-cable`, tilt(cylinder(80, 8, 6).rotateX(-90).translate(0, 240, 0)).color('#1b1c1d'));
};
if (cameras.value === 'twin') {
  camera("cam-left", -150, -AL + 200);
  camera("cam-right", 150, -AL + 200);
  add("cam-crossbar", blk(0, -AL + 200, AZ - 20, 380, 60, 40).color(pole));
} else {
  camera("cam", 0, -AL + 200);
}

// Overview dome camera under the arm near the pole.
add("dome-mount", cylinder(60, 70, 14).translate(0, -420, AZ - 100).color(housing));
add("dome", sphere(70).scale(1, 1, 0.8).translate(0, -420, AZ - 100).color('#1d2a33'));

// Junction box on the pole and CCTV sign facing approaching drivers.
add("junction-box", extrudeRoundedRect(260, 340, 20, 140, { axis: 'y' }).translate(0, -230, PZ + 1600).rotateZ(-20).color(housing));
add("junction-gland", cylinder(60, 18, 8).translate(0, -160, PZ + 1430).rotateZ(-20).color('#1b1c1d'));
add("sign-clamp", cylinder(60, 70, 12).translate(0, 0, PZ + 2350).color(pole));
add("sign-board", blk(0, -84, PZ + 2200, 420, 10, 360).color(sign));
add("sign-border", blk(0, -80, PZ + 2190, 440, 6, 380).color('#1b1c1d'));
add("sign-camera-body", blk(0, 0, -35, 160, 6, 70).rotateY(12).translate(-40, -92, PZ + 2455).color('#1b1c1d'));
add("sign-camera-lens", blk(-140, -92, PZ + 2390, 60, 6, 50).color('#1b1c1d'));
for (const [i, w] of [[0, 300], [1, 240], [2, 300]] as const) add(`sign-text-${i}`, blk(0, -92, PZ + 2250 + i * 40, w, 4, 18).color('#1b1c1d'));

return p.model();
