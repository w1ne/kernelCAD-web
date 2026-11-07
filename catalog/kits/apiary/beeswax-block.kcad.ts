// SPDX-License-Identifier: CC0-1.0
// Beeswax block: Rectangular low-poly beeswax cake with shallow mold ribs and end tabs. Separate beeswax and foundation, label paper surfaces clarify the parts.

meta({
  name: "beeswax-block",
  license: 'CC0-1.0',
  title: "Beeswax block",
  description: "Rectangular low-poly beeswax cake with shallow mold ribs and end tabs. Material controls: wax, paper. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const wax = param('wax', "#e3c978", { label: "Beeswax and foundation" });
const paper = param('paper', "#e7dfc8", { label: "Label paper" });

presets({
  freshApiary: { wax: '#f1df9d', paper: '#f6f0df' },
  weatheredYard: { wax: '#bc9344', paper: '#c6b893' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("beeswax-block");
p.part("block",b(0,0,0,420,290,150).color(wax));
p.part("top",b(0,0,150,400,270,30).color(wax));
p.part("rib-left",b(-160,0,150,22,270,25).color(wax));
p.part("rib-right",b(160,0,150,22,270,25).color(wax));
p.part("tab-front",b(0,-160,10,130,30,50).color(paper));
p.part("tab-back",b(0,160,10,130,30,50).color(paper));

return p.model();
