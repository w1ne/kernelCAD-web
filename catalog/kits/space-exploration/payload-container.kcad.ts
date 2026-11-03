// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "payload-container",
  license: 'CC0-1.0',
  title: "Instrument payload container",
  description: "Square instrument payload canister with lid rim, corner rails and a recessed front panel. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8b8067", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("payload-container");
p.part("body",b(0,0,0,760,760,900).color(color));
p.part("lid",b(0,0,900,820,820,100).color(color));
p.part("corner--330--330",b(-330,-330,20,45,45,900).color(color));
p.part("corner--330-330",b(-330,330,20,45,45,900).color(color));
p.part("corner-330--330",b(330,-330,20,45,45,900).color(color));
p.part("corner-330-330",b(330,330,20,45,45,900).color(color));
p.part("panel",b(0,-390,250,430,20,350).color(color));

return p.model();
