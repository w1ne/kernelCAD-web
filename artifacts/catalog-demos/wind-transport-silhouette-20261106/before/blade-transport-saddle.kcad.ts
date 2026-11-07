// SPDX-License-Identifier: CC0-1.0
// Wind blade transport saddle. Padded transport saddle with two curved-look support blocks and a broad trailer base. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "blade-transport-saddle",
  license: 'CC0-1.0',
  title: "Wind blade transport saddle",
  description: "Padded transport saddle with two curved-look support blocks and a broad trailer base. Controls: scale and structural steel, elastomer; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const elastomer = param('elastomer', '#30383a', { label: 'Elastomer' });

presets({
  weathered: {"structuralSteel": "#425258", "elastomer": "#343c3f"},
  highVisibility: {"structuralSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("blade-transport-saddle");
p.part("base",b(0,0,35,1000,600,70).color(structuralSteel));
p.part("saddle-left",b(-300,0,110,220,500,160).color(elastomer));
p.part("saddle-right",b(300,0,110,220,500,160).color(elastomer));
p.part("strap-bar",b(0,0,240,820,60,45).color(structuralSteel));
p.part("foot--420",b(-420,0,0,100,160,65).color(structuralSteel));
p.part("foot-420",b(420,0,0,100,160,65).color(structuralSteel));

return p.model();
