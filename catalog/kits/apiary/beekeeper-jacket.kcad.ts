// SPDX-License-Identifier: CC0-1.0
// Beekeeper jacket: Protective jacket form with torso, sleeves, collar and integrated hood ring. Separate canvas and protective fabric, woven veil mesh, leather surfaces clarify the parts.

meta({
  name: "beekeeper-jacket",
  license: 'CC0-1.0',
  title: "Beekeeper jacket",
  description: "Protective jacket form with torso, sleeves, collar and integrated hood ring. Material controls: fabric, mesh, leather. Presets: fieldReady and sunWorn.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const fabric = param('fabric', "#c8b78f", { label: "Canvas and protective fabric" });
const mesh = param('mesh', "#4a5e55", { label: "Woven veil mesh" });
const leather = param('leather', "#805b3c", { label: "Leather" });

presets({
  fieldReady: { fabric: '#e7dfc9', mesh: '#6c8075', leather: '#a67a50' },
  sunWorn: { fabric: '#78664a', mesh: '#303d38', leather: '#503a2c' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("beekeeper-jacket");
p.part("torso",b(0,0,260,480,250,570).color(fabric));
p.part("sleeve-left",b(-300,0,280,140,170,500).color(fabric));
p.part("sleeve-right",b(300,0,280,140,170,500).color(fabric));
p.part("cuff-left",b(-300,0,0,155,185,50).color(fabric));
p.part("cuff-right",b(300,0,0,155,185,50).color(fabric));
p.part("collar",b(0,-5,540,210,200,60).color(leather));
p.part("hood-rim",c(0,0,600,40,145,8).color(mesh));

return p.model();
