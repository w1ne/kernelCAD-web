// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "preform-orienter-bowl",
  license: 'CC0-1.0',
  title: "Preform orienter bowl",
  description: "Vibratory bowl with a spiral rim track, central cone, and single-file discharge rail. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("preform-orienter-bowl");
p.part("bowl-skirt", cylinderPart(0, 0, 0, 170, 390, 14, body));
p.part("bowl-rim", cylinderPart(0, 0, 145, 70, 420, 14, accent));
p.part("central-cone", cylinderPart(0, 0, 165, 220, 210, 10, body));
p.part("vibrator-base", cylinderPart(0, 0, 0, 70, 260, 12, body));
p.part("discharge-track", boxPart(470, 0, 175, 440, 110, 55, accent));
p.part("track-side-a", boxPart(470, -65, 205, 440, 18, 75, body));
p.part("track-side-b", boxPart(470, 65, 205, 440, 18, 75, body));
p.part("motor-box", boxPart(-210, 0, 60, 190, 180, 170, body));

return p.model();
