// SPDX-License-Identifier: CC0-1.0
// Nacelle transport frame. Open transport frame with corner posts, support deck and two lifting crossbars. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "nacelle-transport-frame",
  license: 'CC0-1.0',
  title: "Nacelle transport frame",
  description: "Open transport frame with corner posts, support deck and two lifting crossbars. Controls: scale and structural steel, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"structuralSteel": "#425258", "safetyPaint": "#ffc336"},
  highVisibility: {"safetyPaint": "#f7c331", "structuralSteel": "#4b5c63"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("nacelle-transport-frame");
p.part("deck",b(0,0,0,1300,950,120).color(structuralSteel));
p.part("post--560--380",b(-560,-380,60,65,65,700).color(structuralSteel));
p.part("post--560-380",b(-560,380,60,65,65,700).color(structuralSteel));
p.part("post-560--380",b(560,-380,60,65,65,700).color(structuralSteel));
p.part("post-560-380",b(560,380,60,65,65,700).color(structuralSteel));
p.part("cross-a",b(0,0,760,1250,70,70).color(safetyPaint));
p.part("cross-b",b(0,0,660,1250,70,70).color(safetyPaint));

return p.model();
