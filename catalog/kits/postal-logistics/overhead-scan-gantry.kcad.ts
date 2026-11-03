// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "overhead-scan-gantry",
  license: 'CC0-1.0',
  title: "Overhead scan gantry",
  description: "Low scan gantry with twin camera heads, side posts and an integrated parcel conveyor. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5c7685", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("overhead-scan-gantry");
p.part("base-bed", b(0,0,650,720,980,65).color(color));
p.part("post-left", b(-330,-160,0,50,50,650).color(color));
p.part("post-right", b(330,-160,0,50,50,650).color(color));
p.part("post-left-back", b(-330,160,0,50,50,650).color(color));
p.part("post-right-back", b(330,160,0,50,50,650).color(color));
p.part("gantry-front", b(0,-160,620,720,60,70).color(color));
p.part("gantry-back", b(0,160,620,720,60,70).color(color));
p.part("camera-a", b(-155,0,1260,170,170,125).color(color));
p.part("camera-b", b(155,0,1260,170,170,125).color(color));
p.part("side-camera-left", b(-290,0,930,55,130,150).color(color));
p.part("side-camera-right", b(290,0,930,55,130,150).color(color));
p.part("status-box", b(390,0,430,100,150,190).color(color));

return p.model();
