// SPDX-License-Identifier: CC0-1.0
// Bar screen channel: Open intake channel with two retaining walls, screen bars and a raised debris rack. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "bar-screen-channel",
  license: 'CC0-1.0',
  title: "Bar screen channel",
  description: "Open intake channel with two retaining walls, screen bars and a raised debris rack. Parameters: overall scale and concrete, stainless steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#9b9587', stainlessSteel: '#9ca7a6' },
  highVisibility: { concrete: '#c6bdac', stainlessSteel: '#e1ddd0' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bar-screen-channel");
p.part("channel-base",b(0,0,0,1200,900,40).color(concrete));
p.part("wall-left",b(0,-420,20,1200,60,420).color(concrete));
p.part("wall-right",b(0,420,20,1200,60,420).color(concrete));
p.part("screen-bar-0",b(-300,0,60,35,760,300).color(stainlessSteel));
p.part("screen-bar-1",b(-200,0,60,35,760,300).color(stainlessSteel));
p.part("screen-bar-2",b(-100,0,60,35,760,300).color(stainlessSteel));
p.part("screen-bar-3",b(0,0,60,35,760,300).color(stainlessSteel));
p.part("screen-bar-4",b(100,0,60,35,760,300).color(stainlessSteel));
p.part("screen-bar-5",b(200,0,60,35,760,300).color(stainlessSteel));
p.part("screen-bar-6",b(300,0,60,35,760,300).color(stainlessSteel));
p.part("top-crossbar",b(0,0,380,1000,55,45).color(concrete));

return p.model();
