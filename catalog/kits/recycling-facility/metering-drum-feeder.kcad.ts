// SPDX-License-Identifier: CC0-1.0
// Metering drum feeder: a faceted rotating screen drum, feed hopper and opposed discharge chute. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "metering-drum-feeder",
  license: 'CC0-1.0',
  title: "Metering drum feeder",
  description: "Metering drum feeder: a faceted rotating screen drum, feed hopper and opposed discharge chute. Low-poly visualization prop. Material controls: stainless steel, painted steel.",
  tags: ["recycling", "materials recovery", "waste management", "sorting", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#506c68', { label: 'Painted steel' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#5a6c63' },
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
const c = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).translate(x,y,z).scale(scale);
const cy = (x:number,y:number,z:number,h:number,r:number,s:number) => loftCylinder(h,r,s).rotateX(90).translate(x,y,z).scale(scale);

const p = assembly("metering-drum-feeder");
p.part("base-rail-left", b(-441.0,0,0,100,2020,150).color(stainlessSteel));
p.part("base-rail-right", b(441.0,0,0,100,2020,150).color(stainlessSteel));
p.part("feed-hopper", b(0,-969.5999999999999,150,980,420,620).color(paintedSteel));
p.part("screen-drum", cy(0,707.0,520,1252.4,372.4,12).color(stainlessSteel));
p.part("drive-ring-front", cy(0,-161.6,520,115,421.4,12).color(stainlessSteel));
p.part("drive-ring-back", cy(0,888.8,520,115,421.4,12).color(stainlessSteel));
p.part("discharge-chute", b(0,969.5999999999999,150,705.6,380,380).color(paintedSteel));
p.part("drive-motor", c(490.0,242.39999999999998,270,400,130,10).color(paintedSteel));

return p.model();
