// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "rotary-capper",
  license: 'CC0-1.0',
  title: "Rotary bottle capper",
  description: "Capping turret with torque-head ring, bottle table, cap-feed hood, and guarded discharge. Knobs: overall scale, equipment color, and safety accent.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const body = param('body', '#a6b3b4', { label: 'Equipment color' });
const accent = param('accent', '#e3a23d', { label: 'Safety accent' });
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number,color=body) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale).color(color);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10,color=body) => cylinder(h,r,n).translate(x,y,z).scale(scale).color(color);

const p = assembly("rotary-capper");
p.part("base-skirt", cylinderPart(0, 0, 0, 160, 490, 16, accent));
p.part("bottle-table", cylinderPart(0, 0, 160, 130, 390, 16, body));
p.part("turret-column", cylinderPart(0, 0, 290, 710, 145, 12, body));
p.part("top-plate", cylinderPart(0, 0, 1000, 75, 310, 12, accent));
p.part("cap-feed-hood", boxPart(0, 360, 800, 620, 240, 260, body));
p.part("infeed-deck", boxPart(-510, 0, 235, 390, 210, 50, accent));
p.part("outfeed-deck", boxPart(510, 0, 235, 390, 210, 50, accent));
p.part("front-guard", boxPart(0, -510, 250, 950, 32, 500, body));
p.part("capper-head-0", cylinderPart(330.0, 0.0, 730, 190, 34, 8, accent));
p.part("capper-head-1", cylinderPart(233.34539259214466, 233.345082990874, 730, 190, 34, 8, accent));
p.part("capper-head-2", cylinderPart(0.0004378423159035858, 329.99999999970953, 730, 190, 34, 8, accent));
p.part("capper-head-3", cylinderPart(-233.3447733891925, 233.3457021930046, 730, 190, 34, 8, accent));
p.part("capper-head-4", cylinderPart(-329.9999999988382, 0.0008756846318064009, 730, 190, 34, 8, accent));
p.part("capper-head-5", cylinderPart(-233.3460117934536, -233.34446378710038, 730, 190, 34, 8, accent));
p.part("capper-head-6", cylinderPart(-0.0013135269478542241, -329.9999999973858, 730, 190, 34, 8, accent));
p.part("capper-head-7", cylinderPart(233.3441541845973, -233.34632139349205, 730, 190, 34, 8, accent));
p.part("leg-0", boxPart(-330, 0, 0, 48, 48, 230, body));
p.part("leg-1", boxPart(-110, 0, 0, 48, 48, 230, body));
p.part("leg-2", boxPart(110, 0, 0, 48, 48, 230, body));
p.part("leg-3", boxPart(330, 0, 0, 48, 48, 230, body));

return p.model();
