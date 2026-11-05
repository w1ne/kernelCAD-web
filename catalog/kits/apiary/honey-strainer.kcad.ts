// SPDX-License-Identifier: CC0-1.0
// Honey strainer: Stacking filter basket with broad rim, lower tapered-look body and support tabs. Separate stainless steel, woven veil mesh surfaces clarify the parts.

meta({
  name: "honey-strainer",
  license: 'CC0-1.0',
  title: "Honey strainer",
  description: "Stacking filter basket with broad rim, lower tapered-look body and support tabs. Material controls: stainless, mesh. Presets: brightStainless and warmHarvest.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', "#aeb9b7", { label: "Stainless steel" });
const mesh = param('mesh', "#4a5e55", { label: "Woven veil mesh" });

presets({
  brightStainless: { stainless: '#d9dfdc', mesh: '#6c8075' },
  warmHarvest: { stainless: '#788482', mesh: '#303d38' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("honey-strainer");
p.part("basket",c(0,0,0,180,170,8).color(stainless));
p.part("rim",c(0,0,180,35,195,8).color(stainless));
p.part("screen-bar-0",b(-120,0,10,8,250,150).color(mesh));
p.part("screen-bar-1",b(-80,0,10,8,250,150).color(mesh));
p.part("screen-bar-2",b(-40,0,10,8,250,150).color(mesh));
p.part("screen-bar-3",b(0,0,10,8,250,150).color(mesh));
p.part("screen-bar-4",b(40,0,10,8,250,150).color(mesh));
p.part("screen-bar-5",b(80,0,10,8,250,150).color(mesh));
p.part("screen-bar-6",b(120,0,10,8,250,150).color(mesh));
p.part("tab-left",b(-210,0,180,85,55,25).color(stainless));
p.part("tab-right",b(210,0,180,85,55,25).color(stainless));

return p.model();
