// SPDX-License-Identifier: CC0-1.0
// Duplex filter-backwash pump package: two horizontal end-suction centrifugal
// pumps sit beside their finned motors on a shared skid. Separate suction and
// discharge headers, isolation valves, pressure gauges, coupling guards, and
// a local control panel make the package read as a working water-plant module.
// Generic visualization geometry in millimetres, Z up; not a vendor design.

meta({
  name: "backwash-pump-skid",
  license: 'CC0-1.0',
  title: "Filter backwash pump skid",
  description: "Skid-mounted end-suction centrifugal pump package with suction and discharge manifolds, isolation valves, motor cooling fins, pressure gauges and a local control panel. Choose single or duplex duty, then tune coated pump steel, structural frame, stainless pipework and rubber details; weathered and highVisibility palettes included.",
  tags: ['water treatment', 'water utility', 'backwash pump', 'centrifugal pump', 'pump skid', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 3600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pumpArrangement = param('pumpArrangement', 'duplex', { choices: ['single', 'duplex'], label: 'Pump arrangement' });
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated pump and motor steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural skid steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless process pipework' });
const rubber = param('rubber', '#272c2e', { label: 'Rubber couplings and seals' });

presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', rubber: '#333331' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', rubber: '#272c2e' },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const cylX = (x: number, y: number, z: number, length: number, radius: number, sides = 12) =>
  cylinder(length, radius, sides).rotateY(90).translate(x, y, z).scale(scale);
const cylY = (x: number, y: number, z: number, length: number, radius: number, sides = 12) =>
  cylinder(length, radius, sides).rotateX(-90).translate(x, y, z).scale(scale);
const cylZ = (x: number, y: number, z: number, height: number, radius: number, sides = 12) =>
  cylinder(height, radius, sides).translate(x, y, z).scale(scale);

const p = assembly("backwash-pump-skid");
const units = pumpArrangement.value === 'duplex' ? [-330, 330] : [0];

// Welded channel base and cross-members.
p.part("base-deck", b(0, 0, 0, 1380, 820, 45).color(structuralSteel));
for (const y of [-350, 350]) {
  p.part(`skid-rail-${y}`, b(0, y, 45, 1320, 90, 105).color(structuralSteel));
}
for (const x of [-520, 0, 520]) {
  p.part(`skid-crossmember-${x}`, b(x, 0, 45, 90, 650, 65).color(structuralSteel));
  p.part(`leveling-pad-${x}-l`, b(x, -430, 0, 90, 100, 45).color(structuralSteel));
  p.part(`leveling-pad-${x}-r`, b(x, 430, 0, 90, 100, 45).color(structuralSteel));
}

// Shared suction header and branch take-offs sit at the front of the skid.
p.part("suction-header", cylX(-520, -325, 175, 1040, 46).color(stainlessSteel));
p.part("suction-header-end-left", cylX(-535, -325, 175, 28, 64).color(structuralSteel));
p.part("suction-header-end-right", cylX(507, -325, 175, 28, 64).color(structuralSteel));

for (const x of units) {
  // Centrifugal pump volute, end cover, and the short inlet facing the header.
  p.part(`pump-volute-${x}`, cylY(x, -165, 190, 120, 112).color(coatedSteel));
  p.part(`pump-cover-${x}`, cylY(x, -178, 190, 18, 99).color(stainlessSteel));
  p.part(`pump-inlet-${x}`, cylY(x, -235, 190, 75, 43).color(stainlessSteel));
  p.part(`pump-base-${x}`, b(x, -72, 45, 255, 175, 35).color(structuralSteel));
  p.part(`pump-suction-branch-${x}`, cylY(x, -325, 175, 90, 35).color(stainlessSteel));

  // Gate valves show the service point between the header and each pump.
  p.part(`suction-valve-body-${x}`, cylY(x, -292, 175, 48, 53).color(coatedSteel));
  p.part(`suction-valve-stem-${x}`, cylZ(x, -268, 228, 52, 9).color(structuralSteel));
  p.part(`suction-valve-handle-${x}`, b(x, -268, 274, 92, 22, 10).color(structuralSteel));

  // Flexible coupling guard separates the pump shaft from a ribbed TEFC motor.
  p.part(`coupling-${x}`, cylY(x, -45, 190, 72, 31).color(rubber));
  p.part(`coupling-guard-${x}`, b(x, -15, 190, 115, 100, 88).color(structuralSteel));
  p.part(`motor-body-${x}`, cylY(x, 28, 190, 235, 76).color(coatedSteel));
  p.part(`motor-fan-cover-${x}`, cylY(x, 260, 190, 38, 82).color(structuralSteel));
  for (let fin = 0; fin < 5; fin++) {
    p.part(`motor-cooling-fin-${x}-${fin}`, cylY(x, 72 + fin * 34, 190, 9, 83).color(coatedSteel));
  }
  p.part(`motor-terminal-box-${x}`, b(x, 110, 270, 115, 100, 80).color(coatedSteel));
  p.part(`motor-foot-front-${x}`, b(x, 50, 95, 135, 75, 55).color(structuralSteel));
  p.part(`motor-foot-rear-${x}`, b(x, 225, 95, 135, 75, 55).color(structuralSteel));

  // Discharge riser turns over the motor and joins the common delivery header.
  p.part(`discharge-riser-${x}`, cylZ(x, 100, 285, 190, 38).color(stainlessSteel));
  p.part(`discharge-elbow-${x}`, cylY(x, 100, 475, 110, 38).color(stainlessSteel));
  p.part(`discharge-valve-${x}`, cylZ(x, 100, 342, 64, 50).color(coatedSteel));
  p.part(`discharge-valve-stem-${x}`, cylZ(x, 100, 404, 42, 8).color(structuralSteel));
  p.part(`discharge-valve-lever-${x}`, b(x, 100, 441, 82, 18, 10).color(structuralSteel));
  p.part(`pressure-gauge-stem-${x}`, cylY(x, 54, 416, 48, 13).color(stainlessSteel));
  p.part(`pressure-gauge-${x}`, cylY(x, 38, 416, 18, 39).color(structuralSteel));
  p.part(`pressure-gauge-face-${x}`, cylY(x, 18, 416, 12, 29).color(stainlessSteel));
}

// The discharge header stays visible above the motor line in either arrangement.
p.part("discharge-header", cylX(-520, 210, 475, 1040, 42).color(stainlessSteel));
p.part("discharge-header-end-left", cylX(-535, 210, 475, 28, 58).color(structuralSteel));
p.part("discharge-header-end-right", cylX(507, 210, 475, 28, 58).color(structuralSteel));

// Local NEMA-style visualization panel with display, status lamps, and stop.
p.part("control-panel-enclosure", b(530, 45, 55, 220, 150, 300).color(coatedSteel));
p.part("control-panel-face", b(530, -34, 135, 170, 10, 165).color(stainlessSteel));
p.part("control-display", b(530, -43, 230, 90, 8, 42).color(rubber));
p.part("control-display-glass", b(530, -49, 230, 66, 4, 24).color('#73b9d4'));
for (let lamp = 0; lamp < 3; lamp++) {
  p.part(`status-lamp-${lamp}`, cylY(480 + lamp * 50, -40, 180, 10, 11).color(['#45a85b', '#e0b23c', '#d95043'][lamp]));
}
p.part("emergency-stop", cylY(580, -40, 112, 12, 21).color('#d95043'));

return p.model();
