// SPDX-License-Identifier: CC0-1.0
// Original low-poly hydroponics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "uv-treatment-chamber",
  license: 'CC0-1.0',
  title: "UV treatment chamber",
  description: "Horizontal-looking treatment skid with a vertical chamber body, control box and paired pipe stubs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['hydroponics', 'greenhouse', 'controlled environment agriculture', 'low poly', 'scene prop'],
  kit: 'hydroponics',
  category: 'prop',
  origin: 'base',
  compat: ['hydroponics', 'greenhouse', 'controlled-environment-agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657d7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => cylinder(h,r,s).translate(x,y,z).scale(scale);

const p = assembly("uv-treatment-chamber");
p.part("skid-base", b(0,0,0,980,420,75).color(color));
p.part("control-box", b(-320,0,460,240,220,320).color(color));
p.part("service-door", b(-320,-116,500,180,18,170).color(color));
p.part("left-support", b(-140,0,75,55,55,370).color(color));
p.part("right-support", b(250,0,75,55,55,370).color(color));
p.part("pipe-left", b(-500,0,230,250,90,90).color(color));
p.part("pipe-right", b(500,0,230,250,90,90).color(color));
p.part("treatment-canister", c(80,0,130,590,145,10).color(color));
p.part("lamp-cap", c(80,0,720,95,95,10).color(color));
p.part("sample-tap", c(400,-210,360,150,24,10).color(color));

return p.model();
