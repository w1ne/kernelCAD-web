// SPDX-License-Identifier: CC0-1.0
// Conveyor transfer chute: its support, upper crossbeam and material channel. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "conveyor-transfer-chute",
  license: 'CC0-1.0',
  title: "Conveyor transfer chute",
  description: "Conveyor transfer chute: its support, upper crossbeam and material channel. Low-poly visualization prop. Material controls: painted steel, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#506c68', { label: 'Painted steel' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#5a6c63', stainlessSteel: '#9ea7a5' },
  highVisibility: { paintedSteel: '#d77632' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const ngon = (r:number,s:number) => {
  let p = path().moveTo(r * Math.cos(Math.PI / 2), r * Math.sin(Math.PI / 2));
  for (let k = 1; k < s; k++) {
    const a = Math.PI / 2 + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const loftCylinder = (h:number,r:number,s:number) => {
  const levels = [0, h * 0.06, h * 0.94, h];
  const radii = [r * 0.9, r, r, r * 0.9];
  const profiles = levels.map((_, i) => ngon(radii[i], s));
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });
};
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("conveyor-transfer-chute");
p.part("support-frame-left", b(-509.6,0,0,95,1777.6,985).color(paintedSteel));
p.part("support-frame-right", b(509.6,0,0,95,1777.6,985).color(paintedSteel));
p.part("upper-crossbeam", b(0,0,985,1127.0,125,100).color(stainlessSteel));
p.part("material-channel", b(0,0,512.2,735.0,1454.3999999999999,170).color(paintedSteel));
p.part("inspection-hood", b(0,-242.39999999999998,1085,882.0,767.6,240).color(paintedSteel));
p.part("discharge-transition", b(0,848.4,315.2,607.6,340,591.0).color(paintedSteel));
p.part("access-ladder", b(588.0,404.0,0,75,80,886.5).color(stainlessSteel));
p.part("idler", cy(0,-686.8000000000001,485.59999999999997,95,460.59999999999997,10).color(paintedSteel));

return p.model();
