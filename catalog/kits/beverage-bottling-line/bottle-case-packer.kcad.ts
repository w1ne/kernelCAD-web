// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "bottle-case-packer",
  license: 'CC0-1.0',
  title: "Bottle case packer",
  description: "Guarded pick-and-place case packer with bottle grouping lanes and carton lift table. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("bottle-case-packer");
p.part("base", boxPart(0, 0, 0, 1450, 920, 55, accent));
p.part("infeed-conveyor", boxPart(-470, 0, 310, 520, 230, 50, body));
p.part("case-conveyor", boxPart(470, 0, 260, 600, 560, 50, body));
p.part("left-post", boxPart(-300, 0, 75, 70, 70, 1130, body));
p.part("right-post", boxPart(300, 0, 75, 70, 70, 1130, body));
p.part("gantry-beam", boxPart(0, 0, 1205, 700, 90, 70, accent));
p.part("lift-carriage", boxPart(0, 0, 830, 280, 250, 320, body));
p.part("gripper-plate", boxPart(0, 0, 760, 440, 380, 60, accent));
p.part("gripper-0", cylinderPart(-150, -100, 650, 110, 34, 8, body));
p.part("gripper-1", cylinderPart(0, -100, 650, 110, 34, 8, body));
p.part("gripper-2", cylinderPart(150, -100, 650, 110, 34, 8, body));
p.part("gripper-3", cylinderPart(-150, 100, 650, 110, 34, 8, body));
p.part("gripper-4", cylinderPart(0, 100, 650, 110, 34, 8, body));
p.part("gripper-5", cylinderPart(150, 100, 650, 110, 34, 8, body));
p.part("guard-front", boxPart(0, -455, 80, 1280, 30, 760, body));
p.part("control-box", boxPart(520, -360, 630, 190, 100, 300, accent));

return p.model();
