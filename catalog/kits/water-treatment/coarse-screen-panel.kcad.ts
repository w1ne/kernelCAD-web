// SPDX-License-Identifier: CC0-1.0
// Coarse intake screen panel: Removable screen panel in a reinforced frame with evenly spaced vertical bars. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "coarse-screen-panel",
  license: 'CC0-1.0',
  title: "Coarse intake screen panel",
  description: "Removable screen panel in a reinforced frame with evenly spaced vertical bars. Parameters: overall scale and structural steel, stainless steel, safety amber; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
const warningAmber = param('warningAmber', '#e8a936', { label: 'Safety amber' });
presets({
  weathered: { structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6', warningAmber: '#c28e34' },
  highVisibility: { structuralSteel: '#505b60', stainlessSteel: '#e1ddd0', warningAmber: '#ffd138' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("coarse-screen-panel");
p.part("frame-left",b(-430,0,0,70,100,820).color(structuralSteel));
p.part("frame-right",b(430,0,0,70,100,820).color(structuralSteel));
p.part("frame-top",b(0,0,790,900,100,70).color(structuralSteel));
p.part("frame-bottom",b(0,0,0,900,100,70).color(structuralSteel));
p.part("bar-0",b(-330,0,70,24,50,680).color(stainlessSteel));
p.part("bar-1",b(-220,0,70,24,50,680).color(stainlessSteel));
p.part("bar-2",b(-110,0,70,24,50,680).color(stainlessSteel));
p.part("bar-3",b(0,0,70,24,50,680).color(stainlessSteel));
p.part("bar-4",b(110,0,70,24,50,680).color(stainlessSteel));
p.part("bar-5",b(220,0,70,24,50,680).color(stainlessSteel));
p.part("bar-6",b(330,0,70,24,50,680).color(stainlessSteel));
p.part("grip",b(0,-55,810,260,28,55).color(warningAmber));

return p.model();
