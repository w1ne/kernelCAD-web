// SPDX-License-Identifier: CC0-1.0
// Original low-poly mining scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "rock-breaker-boom",
  license: 'CC0-1.0',
  title: "Crusher rock-breaker boom",
  description: "Pedestal-mounted breaker boom with segmented arm, hydraulic cylinders, and hammer tool. Knobs: overall scale and asset color.",
  tags: ['mining', 'mineral processing', 'ore handling', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'mining',
  category: 'prop',
  origin: 'base',
  compat: ['mining', 'mineral-processing', 'industrial', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#b1873d", { label: 'Asset color' });
const baseZ=0;
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z-baseZ+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z-baseZ).scale(scale);

const p=assembly("rock-breaker-boom");
p.part("base-plinth", b(0, 0, 0, 500, 470, 90).color(color));
p.part("turntable", c(0, 0, 90, 130, 220, 10).color(color));
p.part("pedestal", b(0, 0, 220, 240, 240, 300).color(color));
p.part("boom-lower", b(190, 0, 430, 500, 150, 135).color(color));
p.part("boom-upper", b(480, 0, 560, 470, 125, 115).color(color));
p.part("hydraulic-cylinder", b(280, -115, 470, 330, 50, 65).color(color));
p.part("hammer-body", b(760, 0, 470, 140, 135, 320).color(color));
p.part("tool-tip", c(760, 0, 405, 90, 58, 8).color(color));
p.part("hose-pack", b(280, 110, 360, 330, 45, 45).color(color));

return p.model();
