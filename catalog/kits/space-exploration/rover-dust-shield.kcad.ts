// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "rover-dust-shield",
  license: 'CC0-1.0',
  title: "Rover dust shield",
  description: "Pair of broad rover wheel shields with short mounting struts and protective edge lips. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a69c83", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("rover-dust-shield");
p.part("shield-left",b(-380,0,240,420,65,700).color(color));
p.part("shield-right",b(380,0,240,420,65,700).color(color));
p.part("strut--380--80",b(-380,-80,0,55,55,440).color(color));
p.part("strut--380-80",b(-380,80,0,55,55,440).color(color));
p.part("strut-380--80",b(380,-80,0,55,55,440).color(color));
p.part("strut-380-80",b(380,80,0,55,55,440).color(color));
p.part("lip-left",b(-380,-40,590,440,35,55).color(color));
p.part("lip-right",b(380,-40,590,440,35,55).color(color));

return p.model();
