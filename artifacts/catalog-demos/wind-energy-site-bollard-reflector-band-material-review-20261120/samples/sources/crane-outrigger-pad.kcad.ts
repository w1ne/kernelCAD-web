// SPDX-License-Identifier: CC0-1.0
// Crane outrigger pad. Square equipment pad with a shallow top plate, underside ribs and four corner chamfers. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "crane-outrigger-pad",
  license: 'CC0-1.0',
  title: "Crane outrigger pad",
  description: "Square equipment pad with a shallow top plate, underside ribs and four corner chamfers. Controls: scale and recycled polymer, structural steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const recycledPolymer = param('recycledPolymer', '#416457', { label: 'Recycled polymer' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });

presets({
  weathered: {"recycledPolymer": "#334e44", "structuralSteel": "#5c717a"},
  highVisibility: {"recycledPolymer": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("crane-outrigger-pad");
p.part("pad",b(0,0,40,900,900,80).color(recycledPolymer));
p.part("rib-0",b(-300,0,0,55,860,40).color(recycledPolymer));
p.part("rib-1",b(-100,0,0,55,860,40).color(recycledPolymer));
p.part("rib-2",b(100,0,0,55,860,40).color(recycledPolymer));
p.part("rib-3",b(300,0,0,55,860,40).color(recycledPolymer));
p.part("top-plate",b(0,0,90,820,820,20).color(structuralSteel));

return p.model();
