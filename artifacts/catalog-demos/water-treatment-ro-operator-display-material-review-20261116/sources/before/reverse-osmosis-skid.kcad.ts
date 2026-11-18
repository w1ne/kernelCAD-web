// Reverse-osmosis skid: parallel horizontal glass-reinforced epoxy membrane pressure vessels connect to stainless inlet and permeate manifolds above a braced frame, feed pump and local control cabinet. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "reverse-osmosis-skid",
  license: 'CC0-1.0',
  title: "Reverse osmosis skid",
  description: "Reverse-osmosis equipment skid with selectable membrane-vessel count, paired end manifolds, a horizontal feed pump, support saddles and a local control cabinet. Parameters: overall scale, membrane vessel count, coated equipment steel, structural steel, stainless steel, glass-reinforced epoxy vessel shells; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 3300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const membraneVessels = param('membraneVessels', '3', {
  choices: ['2', '3', '4'],
  label: 'Membrane vessels',
});
const vesselCount = Number(membraneVessels.value);
const coatedSteel = param('coatedSteel', '#3d8589', { label: 'Coated equipment steel' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const reinforcedComposite = param('reinforcedComposite', '#f0eee7', { label: 'Glass-reinforced epoxy shells' });

presets({
  weathered: { coatedSteel: '#687b78', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', reinforcedComposite: '#d7d3c8' },
  highVisibility: { coatedSteel: '#e5682d', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', reinforcedComposite: '#f7f4e9' },
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
const loftCylinder = (height: number, radius: number, sides = 10) => {
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
const yCylinder = (x: number, centerY: number, z: number, length: number, radius: number) =>
  loftCylinder(length, radius).rotateX(90).translate(x, centerY + length / 2, z).scale(scale);

const p = assembly("reverse-osmosis-skid");
p.part('skid-base', b(0, 0, 0, 1280, 760, 55).color(structuralSteel));
p.part('frame-rail-front', b(0, -295, 55, 1150, 65, 85).color(structuralSteel));
p.part('frame-rail-back', b(0, 295, 55, 1150, 65, 85).color(structuralSteel));
p.part('cross-member-left', b(-430, 0, 55, 70, 590, 85).color(structuralSteel));
p.part('cross-member-center', b(0, 0, 55, 70, 590, 85).color(structuralSteel));
p.part('cross-member-right', b(430, 0, 55, 70, 590, 85).color(structuralSteel));

// Horizontal pressure tubes, end closures and two saddles per tube are the
// primary silhouette. The count parameter creates a true 2/3/4-vessel train.
const vesselSpacing = 155;
const manifoldLength = (vesselCount - 1) * vesselSpacing + 150;
for (let i = 0; i < vesselCount; i += 1) {
  const y = (i - (vesselCount - 1) / 2) * vesselSpacing;
  p.part(`membrane-vessel-${i + 1}`, xCylinder(-315, y, 245, 630, 68).color(reinforcedComposite));
  p.part(`membrane-cap-left-${i + 1}`, xCylinder(-333, y, 245, 20, 78).color(coatedSteel));
  p.part(`membrane-cap-right-${i + 1}`, xCylinder(313, y, 245, 20, 78).color(coatedSteel));
  p.part(`vessel-band-left-${i + 1}`, xCylinder(-280, y, 245, 12, 73).color(structuralSteel));
  p.part(`vessel-band-right-${i + 1}`, xCylinder(268, y, 245, 12, 73).color(structuralSteel));
  p.part(`vessel-saddle-left-${i + 1}`, b(-165, y, 140, 88, 96, 58).color(coatedSteel));
  p.part(`vessel-saddle-right-${i + 1}`, b(165, y, 140, 88, 96, 58).color(coatedSteel));
  p.part(`feed-branch-${i + 1}`, xCylinder(-366, y, 245, 53, 21).color(stainlessSteel));
  p.part(`permeate-branch-${i + 1}`, xCylinder(313, y, 245, 53, 21).color(stainlessSteel));
}

// The paired manifolds run across the array and meet every vessel branch.
p.part('feed-manifold', yCylinder(-366, 0, 245, manifoldLength, 29).color(stainlessSteel));
p.part('permeate-manifold', yCylinder(366, 0, 245, manifoldLength, 29).color(stainlessSteel));
p.part('feed-isolation-valve', yCylinder(-366, -manifoldLength / 2 - 28, 245, 56, 42).color(coatedSteel));
p.part('permeate-valve', yCylinder(366, manifoldLength / 2 + 28, 245, 56, 38).color(coatedSteel));

// A small horizontal booster pump feeds the inlet manifold from the skid end.
p.part('feed-pump-motor', xCylinder(-555, -200, 132, 142, 54).color(coatedSteel));
p.part('feed-pump-fan-cover', xCylinder(-573, -200, 132, 20, 62).color(structuralSteel));
p.part('pump-coupling', xCylinder(-413, -200, 132, 44, 27).color(stainlessSteel));
p.part('pump-volute', xCylinder(-387, -200, 132, 60, 52).color(coatedSteel));
p.part('pump-discharge-pipe', xCylinder(-366, -200, 132, 30, 24).color(stainlessSteel));
p.part('pump-support-left', b(-505, -200, 55, 65, 130, 77).color(structuralSteel));
p.part('pump-support-right', b(-405, -200, 55, 65, 130, 77).color(structuralSteel));

// The cabinet is separate from the wet end and has a front display and status
// lamps, so the electrical control gear reads as a workstation-sized object.
p.part('control-cabinet', b(530, -245, 55, 190, 155, 270).color(coatedSteel));
p.part('cabinet-door', b(530, -327, 75, 150, 9, 225).color(stainlessSteel));
p.part('operator-display', b(530, -336, 215, 92, 8, 54).color(structuralSteel));
p.part('status-lamp-green', xCylinder(470, -339, 285, 10, 12).color(stainlessSteel));
p.part('status-lamp-red', xCylinder(503, -339, 285, 10, 12).color(coatedSteel));
p.part('cabinet-foot-left', b(480, -245, 55, 30, 145, 38).color(structuralSteel));
p.part('cabinet-foot-right', b(580, -245, 55, 30, 145, 38).color(structuralSteel));

return p.model();
