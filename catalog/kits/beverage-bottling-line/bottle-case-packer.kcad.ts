// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle case packer: guarded pick-and-place case packer with bottle grouping lanes and carton lift table.
meta({
  name: "bottle-case-packer",
  license: 'CC0-1.0',
  title: "Bottle case packer",
  description: "Guarded pick-and-place case packer with bottle grouping lanes and carton lift table. Knobs: overall scale and color controls for stainless steel, powder-coated steel, food-grade polymer, and corrugated board.",
  tags: ['beverage bottling', 'packaging line', 'food manufacturing', 'low poly', 'CC0'],
  kit: 'beverage-bottling-line',
  category: 'structure',
  origin: 'base',
  compat: ['beverage-bottling-line', 'factory', 'food-manufacturing', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.3, step: 0.05 });
const stainlessSteel = param('stainlessSteel', '#aebdc1', { label: 'Stainless steel' });
const powderCoat = param('powderCoat', '#397e91', { label: 'Powder-coated steel' });
const foodPolymer = param('foodPolymer', '#3999a1', { label: 'Food-grade polymer' });
const corrugatedBoard = param('corrugatedBoard', '#b18a5d', { label: 'Corrugated board' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    foodPolymer: '#2c828c',
    corrugatedBoard: '#c49b6b',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    foodPolymer: '#286c75',
    corrugatedBoard: '#886342',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderPart = (x:number,y:number,z:number,h:number,r:number,n=10) => cylinder(h,r,n).translate(x,y,z).scale(scale);

const p = assembly("bottle-case-packer");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/carton|paper|sheet|stack|pallet|cardboard|corrugated|case[-_ ]?(?:blank|wall|stack|pack|lift)/i.test(component)) return shape.color(corrugatedBoard);
  if (/belt|guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(0, 0, 0, 1450, 920, 55)));
p.part("infeed-conveyor", finishPart("infeed-conveyor", boxPart(-470, 0, 310, 520, 230, 50)));
p.part("case-conveyor", finishPart("case-conveyor", boxPart(470, 0, 260, 600, 560, 50)));
p.part("left-post", finishPart("left-post", boxPart(-300, 0, 75, 70, 70, 1130)));
p.part("right-post", finishPart("right-post", boxPart(300, 0, 75, 70, 70, 1130)));
p.part("gantry-beam", finishPart("gantry-beam", boxPart(0, 0, 1205, 700, 90, 70)));
p.part("lift-carriage", finishPart("lift-carriage", boxPart(0, 0, 830, 280, 250, 320)));
p.part("gripper-plate", finishPart("gripper-plate", boxPart(0, 0, 760, 440, 380, 60)));
p.part("gripper-0", finishPart("gripper-0", cylinderPart(-150, -100, 650, 110, 34, 8)));
p.part("gripper-1", finishPart("gripper-1", cylinderPart(0, -100, 650, 110, 34, 8)));
p.part("gripper-2", finishPart("gripper-2", cylinderPart(150, -100, 650, 110, 34, 8)));
p.part("gripper-3", finishPart("gripper-3", cylinderPart(-150, 100, 650, 110, 34, 8)));
p.part("gripper-4", finishPart("gripper-4", cylinderPart(0, 100, 650, 110, 34, 8)));
p.part("gripper-5", finishPart("gripper-5", cylinderPart(150, 100, 650, 110, 34, 8)));
p.part("guard-front-left", finishPart("guard-front-left", boxPart(-650, -455, 80, 32, 30, 760)));
p.part("guard-front-right", finishPart("guard-front-right", boxPart(650, -455, 80, 32, 30, 760)));
p.part("guard-top-rail", finishPart("guard-top-rail", boxPart(0, -455, 840, 1300, 30, 30)));
p.part("guard-bottom-rail", finishPart("guard-bottom-rail", boxPart(0, -455, 80, 1300, 30, 30)));
p.part("control-box", finishPart("control-box", boxPart(520, -360, 630, 190, 100, 300)));

p.part("lift-table", finishPart("lift-table", boxPart(0, 0, 245, 560, 420, 22)));
p.part("carton-bottom", finishPart("carton-bottom", boxPart(0, 0, 267, 420, 300, 18)));
p.part("carton-front-wall", finishPart("carton-front-wall", boxPart(0, -141, 285, 420, 18, 85)));
p.part("carton-back-wall", finishPart("carton-back-wall", boxPart(0, 141, 285, 420, 18, 85)));
p.part("carton-left-wall", finishPart("carton-left-wall", boxPart(-201, 0, 285, 18, 300, 85)));
p.part("carton-right-wall", finishPart("carton-right-wall", boxPart(201, 0, 285, 18, 300, 85)));
for (let row = 0; row < 2; row++) {
  for (let column = 0; column < 3; column++) {
    const x = (column - 1) * 120;
    const y = (row === 0 ? -78 : 78);
    const bottleId = row * 3 + column;
    p.part(`bottle-body-${bottleId}`, finishPart(`bottle-body-${bottleId}`, cylinderPart(x, y, 285, 260, 36, 10)));
    p.part(`bottle-neck-${bottleId}`, finishPart(`bottle-neck-${bottleId}`, cylinderPart(x, y, 545, 48, 15, 10)));
    p.part(`bottle-cap-${bottleId}`, finishPart(`bottle-cap-${bottleId}`, cylinderPart(x, y, 593, 16, 18, 10)));
  }
}

return p.model();
