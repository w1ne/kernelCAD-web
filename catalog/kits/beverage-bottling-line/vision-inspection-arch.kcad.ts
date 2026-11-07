// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "vision-inspection-arch",
  license: 'CC0-1.0',
  title: "Bottle vision inspection arch",
  description: "Inspection portal with overhead camera, backlights, side cameras, and a guarded conveyor gap. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("vision-inspection-arch");
p.part("base-left", boxPart(-420, 0, 0, 250, 600, 55, accent));
p.part("base-right", boxPart(420, 0, 0, 250, 600, 55, accent));
p.part("column-left", boxPart(-420, 0, 75, 60, 60, 820, body));
p.part("column-right", boxPart(420, 0, 75, 60, 60, 820, body));
p.part("camera-beam", boxPart(0, 0, 895, 920, 80, 70, accent));
p.part("top-camera", boxPart(0, -100, 750, 190, 170, 150, body));
p.part("side-camera-0", boxPart(-390, -100, 490, 150, 140, 120, body));
p.part("side-camera-1", boxPart(390, -100, 490, 150, 140, 120, body));
p.part("backlight", boxPart(0, 235, 500, 600, 40, 330, body));
p.part("reject-sensor", boxPart(330, -150, 360, 85, 75, 85, accent));
p.part("conveyor-left", boxPart(-650, 0, 260, 400, 270, 45, body));
p.part("conveyor-right", boxPart(650, 0, 260, 400, 270, 45, body));

return p.model();
