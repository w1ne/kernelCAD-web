// Horizontal split-case pump: a divided scroll casing, paired top nozzles, side cover, guarded shaft coupling and finned motor sit on a two-rail base. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "horizontal-split-case-pump",
  license: 'CC0-1.0',
  title: "Horizontal split case pump",
  description: "Horizontal centrifugal pump with split volute casing, paired suction and discharge flanges, guarded coupling, finned motor, structural rails and stainless connections. Parameters: overall scale, casing size, coated equipment steel, structural steel, stainless steel, elastomer; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const casingSize = param('casingSize', 'standard', {
  choices: ['compact', 'standard', 'heavyDuty'],
  label: 'Casing size',
});
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const elastomer = param('elastomer', '#343b3e', { label: 'Elastomer' });
const casingScale = casingSize.value === 'compact' ? 0.88 : casingSize.value === 'heavyDuty' ? 1.12 : 1;

presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', elastomer: '#3b3d3d' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', elastomer: '#282d30' },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) =>
  box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const section = (radius: number, sides: number) => {
  let outline = path().moveTo(radius * Math.cos(Math.PI / 2), radius * Math.sin(Math.PI / 2));
  for (let k = 1; k < sides; k += 1) {
    const angle = Math.PI / 2 + (2 * Math.PI * k) / sides;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const loftCylinder = (height: number, radius: number, sides = 12) => {
  const levels = [0, height * 0.08, height * 0.92, height];
  const radii = [radius * 0.9, radius, radius, radius * 0.9];
  const profiles = levels.map((_, index) => section(radii[index], sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const xCylinder = (x: number, y: number, z: number, length: number, radius: number) =>
  loftCylinder(length, radius).rotateY(90).translate(x, y, z).scale(scale);
const yCylinder = (x: number, y: number, z: number, length: number, radius: number) =>
  loftCylinder(length, radius).rotateX(90).translate(x, y + length / 2, z).scale(scale);
const verticalCylinder = (x: number, y: number, z: number, height: number, radius: number) =>
  loftCylinder(height, radius).translate(x, y, z).scale(scale);
const sideProfile = (points: Array<[number, number]>, depth: number) => {
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(depth).rotateX(90).translate(0, depth / 2, 0);
};

const p = assembly("horizontal-split-case-pump");
p.part('base-rail-front', b(0, -190, 0, 1100, 75, 55).color(structuralSteel));
p.part('base-rail-back', b(0, 190, 0, 1100, 75, 55).color(structuralSteel));
p.part('cross-member-left', b(-390, 0, 0, 80, 380, 55).color(structuralSteel));
p.part('cross-member-right', b(390, 0, 0, 80, 380, 55).color(structuralSteel));

// A scroll-shaped casting with its separate near-side cover replaces the
// upright drum. The pair of raised nozzles marks suction and discharge ports.
const casing = sideProfile([
  [-180, 127], [-166, 222], [-119, 294], [-48, 330], [34, 323],
  [105, 284], [149, 219], [157, 158], [122, 111], [59, 83],
  [-25, 75], [-107, 91], [-159, 107],
], 166).scale(casingScale).translate(-150, 0, 0).scale(scale);
p.part('split-volute-casing', casing.color(coatedSteel));
p.part('casing-cover', yCylinder(-150, -82, 208, 32, 136).color(stainlessSteel));
p.part('split-line', b(-150, -86, 210, 340, 8, 16).color(stainlessSteel));
p.part('suction-riser', verticalCylinder(-250, 0, 277, 92, 56).color(stainlessSteel));
p.part('suction-flange', verticalCylinder(-250, 0, 360, 24, 76).color(stainlessSteel));
p.part('discharge-riser', verticalCylinder(-58, 0, 277, 122, 48).color(stainlessSteel));
p.part('discharge-flange', verticalCylinder(-58, 0, 386, 24, 68).color(stainlessSteel));
p.part('casing-foot-left', b(-280, 0, 55, 90, 240, 70).color(coatedSteel));
p.part('casing-foot-right', b(-35, 0, 55, 90, 240, 70).color(coatedSteel));

// The elastomer coupling remains visible between the casing bearing and motor;
// cooling ribs distinguish the motor barrel from the cast pump body.
p.part('bearing-housing', xCylinder(0, 0, 278, 100, 69).color(coatedSteel));
p.part('shaft-coupling', xCylinder(90, 0, 278, 140, 34).color(elastomer));
p.part('coupling-guard', b(145, 0, 205, 132, 174, 116).color(structuralSteel));
p.part('motor-stator', xCylinder(210, 0, 280, 300, 101).color(coatedSteel));
p.part('motor-drive-end-bell', xCylinder(190, 0, 280, 28, 114).color(stainlessSteel));
p.part('motor-fan-cover', xCylinder(500, 0, 280, 22, 110).color(coatedSteel));
for (let i = 0; i < 5; i += 1) {
  p.part(`motor-cooling-rib-${i + 1}`, xCylinder(260 + i * 45, 0, 280, 8, 108).color(structuralSteel));
}
p.part('motor-foot-left', b(270, 0, 55, 95, 230, 130).color(coatedSteel));
p.part('motor-foot-right', b(440, 0, 55, 95, 230, 130).color(coatedSteel));

return p.model();
