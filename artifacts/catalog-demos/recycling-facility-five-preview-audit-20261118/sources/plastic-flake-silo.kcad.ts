// SPDX-License-Identifier: CC0-1.0
// Plastic flake silo: the tall, slim aluminium silo that buffers washed
// PET or HDPE flake between the wash line and the extruder. What makes it
// that silo rather than a glass silo: it stands on a closed skirt with an
// access door instead of open legs, flake is blown in through a pneumatic
// conveying line that climbs the side to a cyclone receiver on the roof,
// and it empties through a rotary valve into a pick-up line at the base.
// Generic visualization geometry at about real size (2.8 m diameter,
// 13.5 m high), millimetres, Z up, door, valve and ladder face the camera.

meta({
  name: "plastic-flake-silo",
  license: 'CC0-1.0',
  title: "Plastic flake silo",
  description: "Aluminium plastic-flake silo at about real size: tall slim shell with weld-seam bands on a closed skirt with access door, rotary discharge valve into a pneumatic pick-up line, conveying line up the side to a roof cyclone receiver, caged ladder with rest platform and roof rail, on a concrete plinth. Material controls: silo shell, skirt, conveying pipework and safety rail. plant, weathered, food-grade and highVisibility presets.",
  tags: ["recycling", "plastics", "PET flake", "HDPE", "silo", "pneumatic conveying", "cyclone", "rotary valve", "materials recovery", "waste management", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const shell = param('shell', '#c3c9cc', { label: 'Silo shell (aluminium)' });
const skirt = param('skirt', '#3f7f8a', { label: 'Skirt and roof (painted steel)' });
const pipework = param('pipework', '#7d8589', { label: 'Conveying pipework' });
const safety = param('safety', '#f0b429', { label: 'Ladder cage and handrail' });

presets({
  plant: { shell: '#c3c9cc', skirt: '#3f7f8a', pipework: '#7d8589', safety: '#f0b429' },
  weathered: { shell: '#a9aba5', skirt: '#566b6c', pipework: '#6f716c', safety: '#bf9a45' },
  foodGrade: { shell: '#e2e6e8', skirt: '#d8dcdc', pipework: '#b8c0c3', safety: '#2f6fb5' },
  highVisibility: { shell: '#e8ebec', skirt: '#2a6fb5', pipework: '#d4572a', safety: '#f2d21b' },
});

const p = assembly("plastic-flake-silo");
const add = (name: string, shape: Shape) => p.part(name, shape.scale(scale));
const blk = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2);
// Turned profile [[radius, z], ...] about Z.
const turned = (pts: number[][]) => {
  let pb = path().moveTo(pts[0][0], pts[0][1]);
  for (const [r, z] of pts.slice(1)) pb = pb.lineTo(r, z);
  return pb.close().revolve();
};
const dark = '#2a2e31', concrete = '#a7a39b';

const R = 1400, ZP = 250, ZS = 2900, ZT = 12600;

// Plinth, skirt with a door on -Y, then the shell with seam bands and a roof cone.
add("plinth", blk(0, 0, 0, 3400, 3400, ZP).color(concrete));
add("skirt", cylinder(ZS - ZP, R, 24).translate(0, 0, ZP).color(skirt));
add("skirt-door", blk(-500, -R + 60, ZP + 100, 800, 120, 1900).color(dark));
add("door-frame", blk(-500, -R + 40, ZP + 2000, 1000, 120, 100).color(skirt));
add("shell", cylinder(ZT - ZS, R, 24).translate(0, 0, ZS).color(shell));
for (let z = ZS; z < ZT; z += 1600) add(`seam-${z}`, cylinder(60, R + 20, 24).translate(0, 0, z).color(pipework));
add("roof", turned([[R + 40, ZT], [R + 40, ZT + 80], [260, ZT + 700], [0, ZT + 700], [0, ZT]]).color(skirt));

// Rotary valve and pneumatic pick-up line leaving the skirt toward -X.
add("rotary-valve", blk(-R - 200, 300, ZP + 500, 500, 500, 500).color(pipework));
add("valve-motor", cylinder(450, 150, 12).rotateX(90).translate(-R - 200, 50, ZP + 750).color('#2f5d9a'));
add("pickup-line", cylinder(1800, 70, 10).rotateY(-90).translate(-R - 450, 300, ZP + 650).color(pipework));
for (const x of [-R - 1200, -R - 2100]) add(`pipe-stand-${x}`, blk(x, 300, 0, 120, 120, ZP + 580).color(pipework));

// Inbound conveying line up the -X side to a cyclone receiver on the roof.
const FX = -R - 150, FY = -700, ZR = ZT + 1500;
add("fill-riser", cylinder(ZR - 600, 80, 10).translate(FX, FY, 600).color(pipework));
add("fill-inlet", blk(FX, FY, 300, 300, 300, 300).color(pipework));
add("fill-bend", sphere(120).translate(FX, FY, ZR).color(pipework));
add("fill-roof-run", cylinder(-FX - 420, 80, 10).rotateY(90).translate(FX, FY, ZR).color(pipework));
for (let z = ZS; z < ZT; z += 2400) add(`riser-clamp-${z}`, blk(FX + 200, FY, z, 400, 70, 70).color(skirt));
add("cyclone-barrel", cylinder(900, 420, 16).translate(0, FY, ZR - 450).color(shell));
add("cyclone-cone", turned([[90, ZT + 450], [420, ZR - 450], [0, ZR - 450], [0, ZT + 450]]).translate(0, FY, 0).color(shell));
add("cyclone-vent", cylinder(700, 120, 10).translate(0, FY, ZR + 450).color(pipework));
add("vent-cap", turned([[220, ZR + 1150], [0, ZR + 1300], [0, ZR + 1150]]).translate(0, FY, 0).color(skirt));

// Roof handrail ring on posts.
for (let k = 0; k < 12; k++) {
  const a = ((k * 30 + 15) * Math.PI) / 180;
  add(`rail-post-${k}`, blk((R - 60) * Math.cos(a), (R - 60) * Math.sin(a), ZT, 50, 50, 1100).color(safety));
}
add("handrail", torus(R - 60, 28, 24).translate(0, 0, ZT + 1100).color(safety));

// Caged ladder on -Y (offset in +X), with a rest platform halfway up.
const LX = 700, LY = -R - 300;
for (const s of [-1, 1]) add(`ladder-stile-${s}`, blk(LX + s * 230, LY, ZP, 60, 60, ZT + 1100 - ZP).color(pipework));
for (let z = ZP + 300; z < ZT + 900; z += 600) add(`rung-${z}`, cylinder(460, 18, 6).rotateY(90).translate(LX - 230, LY, z).color(pipework));
for (let z = 2600; z < ZT + 1100; z += 1200) {
  add(`hoop-front-${z}`, blk(LX, LY - 680, z, 760, 40, 50).color(safety));
  for (const s of [-1, 1]) add(`hoop-side-${z}-${s}`, blk(LX + s * 380, LY - 340, z, 40, 680, 50).color(safety));
}
for (const x of [-380, 0, 380]) add(`cage-bar-${x}`, blk(LX + x, x === 0 ? LY - 680 : LY - 340, 2600, 40, 40, ZT + 1100 - 2600).color(safety));
add("rest-platform", blk(LX + 900, LY + 150, 7400, 1100, 800, 80).color(pipework));
add("rest-rail", blk(LX + 900, LY - 230, 8400, 1100, 50, 50).color(safety));
add("rest-post", blk(LX + 1420, LY - 230, 7480, 50, 50, 970).color(safety));

return p.model();
