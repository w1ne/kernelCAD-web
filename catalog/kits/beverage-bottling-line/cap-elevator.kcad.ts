// SPDX-License-Identifier: CC0-1.0
// quality-promotion: beverage-bottling-line 2026-11-05
// Bottle-cap elevator: an open-sided guarded cleated belt rises out of the feed hopper to the sorter discharge.
meta({
  name: "cap-elevator",
  license: 'CC0-1.0',
  title: "Bottle-cap elevator",
  description: "Guarded cleated belt lifts closures from an open feed hopper to an overhead cap-sorter chute. The visible belt flights, return rollers, drive motor, hopper and discharge distinguish the elevator. Knobs: overall scale and material colors for stainless steel, powder-coated steel, food-grade polymer and belt rubber.",
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
const foodPolymer = param('foodPolymer', '#08b1c9', { label: 'Food-grade polymer' });
const beltRubber = param('beltRubber', '#202a2e', { label: 'Belt rubber' });

presets({
  sanitaryLine: {
    stainlessSteel: '#d2dfe1',
    powderCoat: '#4b95a4',
    foodPolymer: '#2c828c',
    beltRubber: '#26343c',
  },
  legacyPlant: {
    stainlessSteel: '#858f91',
    powderCoat: '#315b70',
    foodPolymer: '#286c75',
    beltRubber: '#171d21',
  },
});
const boxPart = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const cylinderX = (x:number,y:number,z:number,length:number,r:number,n=12) => cylinder(length,r,n).rotateY(90).translate(x,y,z).scale(scale);
const tiltedPanel = (x:number,y:number,z:number,w:number,d:number,h:number,angle:number) => box(w,d,h,true).rotateY(angle).translate(x,y,z+h/2).scale(scale);
const sideProfileY = (points:number[][],y0:number,y1:number) => {
  let outline = path().moveTo(points[0][0]!, points[0][1]!);
  for (const [x,z] of points.slice(1)) outline = outline.lineTo(x!, z!);
  return outline.close().extrude(y1-y0).rotateX(90).translate(0,y1,0).scale(scale);
};

const p = assembly("cap-elevator");
const finishPart = (name: string, shape: ReturnType<typeof boxPart>) => {
  const component = name.toLowerCase();
  if (/belt-web|rubber/i.test(component)) return shape.color(beltRubber);
  if (/guide|film|web|label|pad|seal|grip|cap|bottle|liner|tray|hose|cleat|divider|wheel|wrap|tape|suction|sleeve/i.test(component)) return shape.color(foodPolymer);
  if (/base|leg|foot|frame|support|stand|control|housing|cabinet|motor|drive|beam|panel|hood|skid|mount|platform|guard|rail|post|lift|jacket/i.test(component)) return shape.color(powderCoat);
  return shape.color(stainlessSteel);
};
p.part("base", finishPart("base", boxPart(70, 0, 0, 620, 650, 55)));
for (const [i, [x,y]] of [[-210,-255],[-210,255],[350,-255],[350,255]].entries()) {
  p.part(`support-leg-${i}`, finishPart(`support-leg-${i}`, boxPart(x, y, 35, 55, 55, 355)));
}
p.part("base-crossbeam-front", finishPart("base-crossbeam-front", boxPart(70, 255, 310, 560, 55, 65)));
p.part("base-crossbeam-back", finishPart("base-crossbeam-back", boxPart(70, -255, 310, 560, 55, 65)));

// Open feed hopper: a tapered rear plate, two angled cheeks and a clear opening
// on the belt side keep the lower flights visible in the catalog view.
p.part("hopper-floor", finishPart("hopper-floor", boxPart(70, 0, 400, 390, 390, 28)));
p.part("hopper-rear", finishPart("hopper-rear", sideProfileY([
  [-125, 425], [265, 425], [335, 820], [-195, 820],
], -205, -175)));
p.part("hopper-side-left", finishPart("hopper-side-left", tiltedPanel(-145, -10, 425, 30, 390, 395, -10)));
p.part("hopper-side-right", finishPart("hopper-side-right", tiltedPanel(285, -10, 425, 30, 390, 395, 10)));
p.part("hopper-outlet-left", finishPart("hopper-outlet-left", boxPart(-85, 0, 425, 35, 250, 120)));
p.part("hopper-outlet-right", finishPart("hopper-outlet-right", boxPart(225, 0, 425, 35, 250, 120)));

// Open-sided guards frame the belt without covering its working face; the
// previous solid shroud hid the flights and made the asset read as a cabinet.
p.part("belt-back-rail-left", finishPart("belt-back-rail-left", boxPart(-80, -145, 520, 28, 24, 1450)));
p.part("belt-back-rail-right", finishPart("belt-back-rail-right", boxPart(220, -145, 520, 28, 24, 1450)));
p.part("side-rail-a", finishPart("side-rail-a", boxPart(-120, 125, 500, 42, 52, 1540)));
p.part("side-rail-b", finishPart("side-rail-b", boxPart(260, 125, 500, 42, 52, 1540)));
p.part("top-crossbar", finishPart("top-crossbar", boxPart(70, 125, 1980, 360, 52, 55)));
p.part("lower-return-roller", finishPart("lower-return-roller", cylinderX(-40, 235, 520, 220, 52, 12)));
p.part("upper-drive-roller", finishPart("upper-drive-roller", cylinderX(-40, 235, 1970, 220, 52, 12)));
p.part("belt-web", finishPart("belt-web", boxPart(70, 235, 520, 220, 20, 1450)));
for (let i = 0; i < 8; i++) {
  p.part(`belt-cleat-${i}`, finishPart(`belt-cleat-${i}`, boxPart(70, 235, 585 + i * 175, 270, 90, 50)));
}
p.part("drive-motor", finishPart("drive-motor", cylinderX(-315, 235, 520, 190, 58, 12)));
p.part("drive-gearbox", finishPart("drive-gearbox", boxPart(-175, 235, 455, 115, 125, 120)));

// An open stainless trough hands the elevated caps to the overhead sorter.
p.part("discharge-floor", finishPart("discharge-floor", boxPart(330, 235, 1970, 460, 230, 22)));
p.part("discharge-rail-front", finishPart("discharge-rail-front", boxPart(330, 355, 1992, 460, 20, 72)));
p.part("discharge-rail-back", finishPart("discharge-rail-back", boxPart(330, 115, 1992, 460, 20, 72)));
p.part("control-cabinet", finishPart("control-cabinet", boxPart(390, -75, 115, 155, 150, 270)));

return p.model();
