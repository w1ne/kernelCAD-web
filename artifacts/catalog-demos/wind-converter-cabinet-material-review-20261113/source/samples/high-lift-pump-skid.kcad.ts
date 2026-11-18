// High-lift pump skid: a horizontal finned motor drives a scroll-shaped pump casing with a front suction flange and vertical discharge riser. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "high-lift-pump-skid",
  license: 'CC0-1.0',
  title: "High lift pump skid",
  description: "Horizontal centrifugal pump with a scroll casing, finned motor, guarded coupling, bolted base and stainless suction and discharge connections. Parameters: overall scale, pump capacity, coated equipment steel, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 3200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const pumpCapacity = param('pumpCapacity', 'standard', {
  choices: ['compact', 'standard', 'highFlow'],
  label: 'Pump capacity',
});
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const capacityScale = pumpCapacity.value === 'compact' ? 0.88 : pumpCapacity.value === 'highFlow' ? 1.12 : 1;

presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
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
const sizedVerticalCylinder = (x: number, y: number, z: number, height: number, radius: number) =>
  loftCylinder(height, radius).scale(capacityScale).translate(x, y, z).scale(scale);
const xCylinder = (x: number, y: number, z: number, length: number, radius: number) =>
  loftCylinder(length, radius).rotateY(90).translate(x, y, z).scale(scale);
const sizedYCylinder = (x: number, y: number, z: number, length: number, radius: number) =>
  loftCylinder(length, radius).scale(capacityScale).rotateX(90).translate(x, y + length / 2, z).scale(scale);
const sideProfile = (points: Array<[number, number]>, depth: number) => {
  let outline = path().moveTo(points[0][0], points[0][1]);
  for (const [x, z] of points.slice(1)) outline = outline.lineTo(x, z);
  return outline.close().extrude(depth).rotateX(90).translate(0, depth / 2, 0);
};

const p = assembly("high-lift-pump-skid");
p.part('base-rail-front', b(0, -280, 0, 1120, 80, 55).color(structuralSteel));
p.part('base-rail-back', b(0, 280, 0, 1120, 80, 55).color(structuralSteel));
p.part('cross-member-left', b(-390, 0, 0, 90, 560, 55).color(structuralSteel));
p.part('cross-member-right', b(390, 0, 0, 90, 560, 55).color(structuralSteel));

// The motor barrel runs on the pump shaft axis; cooling ribs and end bells make
// its cylindrical silhouette read separately from the guarded shaft coupling.
p.part('motor-stator', xCylinder(-450, 0, 300, 360, 124).color(coatedSteel));
p.part('motor-drive-end-bell', xCylinder(-472, 0, 300, 28, 138).color(stainlessSteel));
p.part('motor-fan-cover', xCylinder(-92, 0, 300, 24, 136).color(coatedSteel));
for (let i = 0; i < 6; i += 1) {
  p.part(`motor-cooling-rib-${i + 1}`, xCylinder(-365 + i * 42, 0, 300, 8, 132).color(structuralSteel));
}
p.part('motor-foot-left', b(-340, 0, 55, 105, 260, 125).color(coatedSteel));
p.part('motor-foot-right', b(-125, 0, 55, 105, 260, 125).color(coatedSteel));
p.part('shaft-coupling', xCylinder(-68, 0, 300, 105, 34).color(stainlessSteel));
p.part('coupling-guard', b(-18, 0, 205, 125, 205, 115).color(structuralSteel));

// This faceted scroll profile and its round cover identify the centrifugal
// casing; the front-facing flange is the suction inlet and the riser is outlet.
const volute = sideProfile([
  [-138, 112], [-132, 190], [-104, 254], [-53, 296], [15, 312],
  [78, 290], [122, 246], [137, 190], [122, 142], [84, 104],
  [26, 80], [-44, 76], [-102, 88],
], 160).scale(capacityScale).translate(170, 0, 0).scale(scale);
p.part('scroll-volute-casing', volute.color(coatedSteel));
p.part('impeller-cover', sizedYCylinder(170, -78, 190, 24, 122).color(stainlessSteel));
p.part('suction-neck', sizedYCylinder(65, -140, 172, 118, 63).color(stainlessSteel));
p.part('suction-flange', sizedYCylinder(65, -212, 172, 30, 82).color(stainlessSteel));
p.part('discharge-neck', sizedVerticalCylinder(286, 0, 252, 158, 49).color(stainlessSteel));
p.part('discharge-flange', sizedVerticalCylinder(286, 0, 399, 26, 67).color(stainlessSteel));
p.part('discharge-riser', sizedVerticalCylinder(286, 0, 425, 92, 43).color(stainlessSteel));
p.part('casing-foot-left', b(68, 0, 55, 100, 230, 74).color(coatedSteel));
p.part('casing-foot-right', b(262, 0, 55, 100, 230, 74).color(coatedSteel));

return p.model();
