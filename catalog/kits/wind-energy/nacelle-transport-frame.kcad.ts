// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "nacelle-transport-frame",
  license: 'CC0-1.0',
  title: "Nacelle transport frame",
  description: "Open transport frame with corner posts, support deck and two lifting crossbars. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#747b78", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("nacelle-transport-frame");
p.part("deck",b(0,0,0,1300,950,120).color(color));
p.part("post--560--380",b(-560,-380,60,65,65,700).color(color));
p.part("post--560-380",b(-560,380,60,65,65,700).color(color));
p.part("post-560--380",b(560,-380,60,65,65,700).color(color));
p.part("post-560-380",b(560,380,60,65,65,700).color(color));
p.part("cross-a",b(0,0,760,1250,70,70).color(color));
p.part("cross-b",b(0,0,660,1250,70,70).color(color));

return p.model();
