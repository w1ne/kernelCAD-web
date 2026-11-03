// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "cap-orienter",
  license: 'CC0-1.0',
  title: "Bottle-cap orienter",
  description: "Vibratory cap bowl with a guarded spiral track and single-file cap exit. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("cap-orienter");
p.part("bowl-base", cylinderPart(0, 0, 0, 90, 360, 14, accent));
p.part("bowl-body", cylinderPart(0, 0, 90, 170, 390, 14, body));
p.part("center-hub", cylinderPart(0, 0, 260, 230, 95, 10, accent));
p.part("upper-ring", cylinderPart(0, 0, 245, 60, 330, 14, body));
p.part("exit-track", boxPart(435, 0, 240, 410, 105, 52, accent));
p.part("guide-front", boxPart(435, -58, 270, 410, 18, 78, body));
p.part("guide-back", boxPart(435, 58, 270, 410, 18, 78, body));
p.part("drive-box", boxPart(-230, 0, 30, 220, 180, 180, body));
p.part("track-tab-0", boxPart(-110, -250, 210, 65, 35, 18, accent));
p.part("track-tab-1", boxPart(-40, -250, 228, 65, 35, 18, accent));
p.part("track-tab-2", boxPart(30, -250, 246, 65, 35, 18, accent));
p.part("track-tab-3", boxPart(100, -250, 264, 65, 35, 18, accent));
p.part("track-tab-4", boxPart(170, -250, 282, 65, 35, 18, accent));

return p.model();
