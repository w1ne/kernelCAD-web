// SPDX-License-Identifier: CC0-1.0
// Recovered-material bale stack: a compact stack of rectangular recovered-material bales held by narrow binding bands. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "bale-stack",
  license: 'CC0-1.0',
  title: "Recovered-material bale stack",
  description: "Recovered-material bale stack: a compact stack of rectangular recovered-material bales held by narrow binding bands. Low-poly visualization prop. Material controls: recovered material, stainless steel.",
  tags: ["recycling", "materials recovery", "waste management", "baling", "low poly", "scene prop"],
  kit: "recycling-facility",
  category: 'prop',
  origin: 'base',
  compat: ['recycling-facility', 'materials-recovery', 'waste-management', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const recoveredMaterial = param('recoveredMaterial', '#ae8a55', { label: 'Recovered material' });
const stainlessSteel = param('stainlessSteel', '#a8b4b6', { label: 'Stainless steel' });
presets({
  weathered: { recoveredMaterial: '#a38456', stainlessSteel: '#9ea7a5' },
  highVisibility: { recoveredMaterial: '#b98a4d' },
});
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("bale-stack");
p.part("bale-1", b(-370,-260,0,700,500,420).color(recoveredMaterial));
p.part("binding-band-1", b(-370,-513,120,710,28,42).color(stainlessSteel));
p.part("bale-2", b(370,-260,0,700,500,420).color(recoveredMaterial));
p.part("binding-band-2", b(370,-513,120,710,28,42).color(stainlessSteel));
p.part("bale-3", b(-370,260,0,700,500,420).color(recoveredMaterial));
p.part("binding-band-3", b(-370,7,120,710,28,42).color(stainlessSteel));
p.part("bale-4", b(370,260,0,700,500,420).color(recoveredMaterial));
p.part("binding-band-4", b(370,7,120,710,28,42).color(stainlessSteel));
p.part("bale-5", b(-370,0,420,700,500,420).color(recoveredMaterial));
p.part("binding-band-5", b(-370,-253,540,710,28,42).color(stainlessSteel));
p.part("bale-6", b(370,0,420,700,500,420).color(recoveredMaterial));
p.part("binding-band-6", b(370,-253,540,710,28,42).color(stainlessSteel));

return p.model();
