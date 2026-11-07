// SPDX-License-Identifier: CC0-1.0
// Walking-floor trailer: its skids, top cover and access. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "walking-floor-trailer",
  license: 'CC0-1.0',
  title: "Walking-floor trailer",
  description: "Walking-floor trailer: its skids, top cover and access. Low-poly visualization prop. Material controls: stainless steel, painted steel, rubber.",
  tags: ["recycling", "materials recovery", "waste management", "containers", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
const paintedSteel = param('paintedSteel', '#806d5d', { label: 'Painted steel' });
const rubber = param('rubber', '#303638', { label: 'Rubber' });
presets({
  weathered: { stainlessSteel: '#9ea7a5', paintedSteel: '#7b6c5c', rubber: '#3c403e' },
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

const p = assembly("walking-floor-trailer");
p.part("base-skids", b(0,0,0,1450,820,100).color(stainlessSteel));
p.part("body", b(0,0,100,1370,740,1030).color(paintedSteel));
p.part("top-cover", b(0,0,1130,1470,840,65).color(paintedSteel));
p.part("access-panel", b(0,-435.0,610.2,667.0,35,474.59999999999997).color(paintedSteel));
p.part("handle-left", b(-493.00000000000006,-470.0,621.5,120,45,130).color(stainlessSteel));
p.part("handle-right", b(493.00000000000006,-470.0,621.5,120,45,130).color(stainlessSteel));
p.part("left-wheel", cy(-653.0,480.0,105,70,72,10).color(rubber));
p.part("right-wheel", cy(653.0,480.0,105,70,72,10).color(rubber));
p.part("left-wheel-far", cy(-653.0,-340.0,105,70,72,10).color(rubber));
p.part("right-wheel-far", cy(653.0,-340.0,105,70,72,10).color(rubber));

return p.model();
