// SPDX-License-Identifier: CC0-1.0
// Rooftop wind turbine. Compact roof turbine on a tripod mast with short nacelle and three stub blades. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "rooftop-wind-turbine",
  license: 'CC0-1.0',
  title: "Rooftop wind turbine",
  description: "Compact roof turbine on a tripod mast with short nacelle and three stub blades. Controls: scale and painted steel, fiberglass composite, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 550,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#53727c', { label: 'Painted steel' });
const fiberglassComposite = param('fiberglassComposite', '#e7ebe1', { label: 'Fiberglass composite' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"paintedSteel": "#415961", "fiberglassComposite": "#f9fef3"},
  highVisibility: {"fiberglassComposite": "#e48d35"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);


const ngon = (radius: number, sides: number, offset = 0) => {
  let profile = path().moveTo(radius * Math.cos(offset), radius * Math.sin(offset));
  for (let i = 1; i < sides; i++) {
    const angle = offset + (2 * Math.PI * i) / sides;
    profile = profile.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return profile.close();
};
const towerShape = (levels: number[][], sides = 10) => {
  const profiles = levels.map((level, i) => ngon(level[1]!, sides, (i % 2) * Math.PI / sides));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map(([z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  }).scale(scale);
};
const rotorHub = (x: number, y: number, z: number, length: number, radius: number, sides = 12) =>
  cylinder(length, radius, sides).rotateX(90).translate(x, y + length / 2, z).scale(scale);
const rotorBlade = (span: number, rootChord: number, middleChord: number, tipChord: number, thickness: number, sweep = 20) => {
  const profile = path()
    .moveTo(-rootChord / 2, 0)
    .lineTo(rootChord / 2, 0)
    .lineTo(sweep + middleChord / 2, span * 0.46)
    .lineTo(sweep + tipChord / 2, span)
    .lineTo(sweep - tipChord / 2, span)
    .lineTo(sweep - middleChord / 2, span * 0.46)
    .lineTo(-rootChord / 2, 0)
    .close();
  return profile.extrude(thickness).rotateX(90).translate(0, thickness / 2, 0).scale(scale);
};

const p=assembly("rooftop-wind-turbine");
p.part("roof-plate",b(0,0,0,520,520,50).color(paintedSteel));
p.part("mast",towerShape([[50,56],[785,34]],9).color(paintedSteel));
p.part("nacelle",b(0,0,810,380,150,150).color(paintedSteel));
p.part("hub",rotorHub(0,-112,902,104,68,10).color(stainlessSteel));
p.part("blade-up",rotorBlade(450,112,72,24,32,12).translate(0,-112,902).color(fiberglassComposite));
p.part("blade-left",rotorBlade(450,112,72,24,32,12).rotateY(120).translate(0,-112,902).color(fiberglassComposite));
p.part("blade-right",rotorBlade(450,112,72,24,32,12).rotateY(240).translate(0,-112,902).color(fiberglassComposite));
p.part("leg--180--180",b(-180,-180,35,45,45,370).color(paintedSteel));
p.part("leg-180--180",b(180,-180,35,45,45,370).color(paintedSteel));
p.part("leg-0-180",b(0,180,35,45,45,370).color(paintedSteel));

return p.model();
