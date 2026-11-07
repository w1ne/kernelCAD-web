// SPDX-License-Identifier: CC0-1.0
// Uncapping tank: Open rectangular uncapping tank with rim, ledge and elevated collection legs. Separate stainless steel, molded polymer surfaces clarify the parts.

meta({
  name: "uncapping-tank",
  license: 'CC0-1.0',
  title: "Uncapping tank",
  description: "Open rectangular uncapping tank with rim, ledge and elevated collection legs. Material controls: stainless, polymer. Presets: brightStainless and warmHarvest.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });

presets({
  brightStainless: { stainless: '#d9dfdc', polymer: '#d7e2d8' },
  warmHarvest: { stainless: '#788482', polymer: '#3f5d54' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("uncapping-tank");
p.part("tank",b(0,0,150,620,440,250).color(stainless));
p.part("rim-front",b(0,-220,400,650,35,55).color(stainless));
p.part("rim-back",b(0,220,400,650,35,55).color(stainless));
p.part("rim-left",b(-310,0,400,35,405,55).color(stainless));
p.part("rim-right",b(310,0,400,35,405,55).color(stainless));
p.part("frame-ledge-left",b(-390,0,440,180,60,45).color(polymer));
p.part("frame-ledge-right",b(390,0,440,180,60,45).color(polymer));
p.part("leg--240",b(-240,0,0,55,55,150).color(stainless));
p.part("leg-240",b(240,0,0,55,55,150).color(stainless));

return p.model();
