// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "shrink-bundle-wrapper",
  license: 'CC0-1.0',
  title: "Bottle bundle shrink wrapper",
  description: "Film-feed frame gathers multipacks and wraps them before the shrink tunnel. Knobs: overall scale, equipment color, and safety accent.",
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
const xCylinderPart = (x:number,y:number,z:number,length:number,r:number,n=10,color=body) => cylinder(length,r,n).rotate([0,1,0],90).translate(x-length/2,y,z).scale(scale).color(color);

const p = assembly("shrink-bundle-wrapper");
p.part("base", boxPart(0, 0, 0, 1330, 780, 55, accent));
p.part("product-bed", boxPart(0, 0, 300, 1300, 390, 50, body));
p.part("portal-left", boxPart(-450, 0, 70, 60, 60, 760, body));
p.part("portal-right", boxPart(450, 0, 70, 60, 60, 760, body));
p.part("portal-top", boxPart(0, 0, 830, 960, 70, 55, body));
p.part("film-reel", cylinderPart(-250, 220, 580, 55, 145, 12, accent));
p.part("film-roller-a", xCylinderPart(-50, 190, 570, 360, 38, 10, body));
p.part("film-roller-b", xCylinderPart(230, 190, 390, 360, 38, 10, body));
p.part("film-cut-bar", boxPart(160, 0, 510, 55, 540, 45, accent));
p.part("control-pod", boxPart(560, -250, 460, 180, 150, 280, body));
p.part("leg-0", boxPart(-390, 0, 0, 52, 52, 290, body));
p.part("leg-1", boxPart(-130, 0, 0, 52, 52, 290, body));
p.part("leg-2", boxPart(130, 0, 0, 52, 52, 290, body));
p.part("leg-3", boxPart(390, 0, 0, 52, 52, 290, body));

return p.model();
