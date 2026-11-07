// SPDX-License-Identifier: CC0-1.0
// Queen introduction cage: Small ventilated queen cage with end plugs, hanging loop and cross bars. Separate molded polymer, stainless steel surfaces clarify the parts.

meta({
  name: "queen-cage",
  license: 'CC0-1.0',
  title: "Queen introduction cage",
  description: "Small ventilated queen cage with end plugs, hanging loop and cross bars. Material controls: polymer, stainless. Presets: freshApiary and weatheredYard.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polymer = param('polymer', "#67877b", { label: "Molded polymer" });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });

presets({
  freshApiary: { polymer: '#d7e2d8', stainless: '#d9dfdc' },
  weatheredYard: { polymer: '#3f5d54', stainless: '#788482' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("queen-cage");
p.part("cage-body",b(0,0,20,180,90,230).color(polymer));
p.part("end-low",b(0,0,0,190,100,25).color(polymer));
p.part("end-high",b(0,0,250,190,100,25).color(polymer));
p.part("vent-0",b(-65,-50,45,16,12,180).color(polymer));
p.part("vent-1",b(-22,-50,45,16,12,180).color(polymer));
p.part("vent-2",b(21,-50,45,16,12,180).color(polymer));
p.part("vent-3",b(64,-50,45,16,12,180).color(polymer));
p.part("hanging-loop",b(0,0,275,85,35,45).color(stainless));

return p.model();
