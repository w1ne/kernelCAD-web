// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Pallet slip-sheet dispenser: magazine and vacuum pick head feed a separator sheet to the palletizing station.
meta({
  name: "slip-sheet-dispenser",
  license: 'CC0-1.0',
  title: "Pallet slip-sheet dispenser",
  description: "Magazine and vacuum pick head feed a separator sheet to the palletizing station. Knobs: overall scale and color controls for stainless steel, powder-coated steel, and corrugated board.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'prop',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Powder-coated steel' });
const corrugatedBoard = param('corrugatedBoard', '#b18a5d', { label: 'Corrugated board' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    corrugatedBoard: '#c49b6b',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    corrugatedBoard: '#886342',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("slip-sheet-dispenser");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/carton|paper|sheet|stack|pallet|cardboard|corrugated|case[-_ ]?(?:blank|wall|stack|pack|lift)/i.test(component)) return shape.color(corrugatedBoard);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 720, 620, 55)));
p.part("sheet-stack", finishPart("sheet-stack", boxPart(0, 0, 150, 560, 460, 280)));
p.part("magazine-post-left", finishPart("magazine-post-left", boxPart(-300, 0, 75, 55, 55, 850)));
p.part("magazine-post-right", finishPart("magazine-post-right", boxPart(300, 0, 75, 55, 55, 850)));
p.part("top-beam", finishPart("top-beam", boxPart(0, 0, 900, 660, 70, 60)));
p.part("pick-head", finishPart("pick-head", boxPart(0, 0, 700, 400, 330, 110)));
p.part("vacuum-cup-0", finishPart("vacuum-cup-0", cylinderPart(-130, -100, 630, 80, 33, 8)));
p.part("vacuum-cup-1", finishPart("vacuum-cup-1", cylinderPart(130, -100, 630, 80, 33, 8)));
p.part("vacuum-cup-2", finishPart("vacuum-cup-2", cylinderPart(-130, 100, 630, 80, 33, 8)));
p.part("vacuum-cup-3", finishPart("vacuum-cup-3", cylinderPart(130, 100, 630, 80, 33, 8)));
p.part("outfeed-shelf", finishPart("outfeed-shelf", boxPart(0, 470, 310, 760, 240, 55)));
p.part("vacuum-pump", finishPart("vacuum-pump", cylinderPart(-260, -240, 80, 155, 70, 10)));

return p.model();
