// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly beverage-bottling scene prop, millimetres, Z up.
meta({
  name: "rotary-filler",
  license: 'CC0-1.0',
  title: "Rotary bottle filler",
  description: "Filling carousel with a covered product bowl, dosing valves, guard skirt, and discharge deck. Knobs: overall scale, equipment color, and safety accent.",
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

const p = assembly("rotary-filler");
p.part("base-skirt", cylinderPart(0, 0, 0, 180, 530, 16, accent));
p.part("filler-table", cylinderPart(0, 0, 180, 140, 430, 16, body));
p.part("product-bowl", cylinderPart(0, 0, 320, 210, 300, 14, body));
p.part("top-cover", cylinderPart(0, 0, 530, 75, 340, 14, accent));
p.part("center-drive", cylinderPart(0, 0, 605, 410, 95, 12, body));
p.part("infeed-deck", boxPart(-550, 0, 250, 380, 220, 55, body));
p.part("outfeed-deck", boxPart(550, 0, 250, 380, 220, 55, body));
p.part("operator-rail", boxPart(0, -580, 250, 1040, 42, 45, accent));
p.part("fill-valve-0", cylinderPart(360.0, 0.0, 450, 230, 27, 8, body));
p.part("fill-valve-1", cylinderPart(311.76922497006126, 179.99986211541204, 450, 230, 27, 8, body));
p.part("fill-valve-2", cylinderPart(180.0002757690703, 311.7689861468883, 450, 230, 27, 8, body));
p.part("fill-valve-3", cylinderPart(0.0004776461628838479, 359.99999999968315, 450, 230, 27, 8, body));
p.part("fill-valve-4", cylinderPart(-179.99944846143694, 311.76946379268526, 450, 230, 27, 8, body));
p.part("fill-valve-5", cylinderPart(-311.7687473231667, 180.0006894224115, 450, 230, 27, 8, body));
p.part("fill-valve-6", cylinderPart(-359.9999999987325, 0.0009552923257668548, 450, 230, 27, 8, body));
p.part("fill-valve-7", cylinderPart(-311.7697026147605, -179.99903480714502, 450, 230, 27, 8, body));
p.part("fill-valve-8", cylinderPart(-180.00110307543616, -311.76850849889604, 450, 230, 27, 8, body));
p.part("fill-valve-9", cylinderPart(-0.0014329384882485001, -359.99999999714817, 450, 230, 27, 8, body));
p.part("fill-valve-10", cylinderPart(179.99862115253634, -311.7699414362868, 450, 230, 27, 8, body));
p.part("fill-valve-11", cylinderPart(311.76826967407675, -180.00151672814357, 450, 230, 27, 8, body));
p.part("leg-0", boxPart(-350, 0, 0, 55, 55, 250, body));
p.part("leg-1", boxPart(-120, 0, 0, 55, 55, 250, body));
p.part("leg-2", boxPart(110, 0, 0, 55, 55, 250, body));
p.part("leg-3", boxPart(340, 0, 0, 55, 55, 250, body));

return p.model();
