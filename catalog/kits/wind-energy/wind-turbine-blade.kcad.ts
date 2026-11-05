// SPDX-License-Identifier: CC0-1.0
// Wind turbine blade. Tapered-look turbine blade with a broad root block and slender tip section. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "wind-turbine-blade",
  license: 'CC0-1.0',
  title: "Wind turbine blade",
  description: "Tapered-look turbine blade with a broad root block and slender tip section. Controls: scale and fiberglass composite, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fiberglassComposite = param('fiberglassComposite', '#e7ebe1', { label: 'Fiberglass composite' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"fiberglassComposite": "#b4b7b0", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"fiberglassComposite": "#e48d35"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("wind-turbine-blade");
const bladeOutline = path()
  .moveTo(-150,0).lineTo(150,0).lineTo(115,580).lineTo(72,1320)
  .lineTo(30,2040).lineTo(-26,2040).lineTo(-76,1320).lineTo(-124,580).close();
p.part("blade",bladeOutline.extrude(72).rotateX(90).translate(0,36,20).scale(scale).color(fiberglassComposite));
p.part("root-ring",b(0,0,0,280,205,35).color(stainlessSteel));

return p.model();
