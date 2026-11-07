// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "dust-protection-screen",
  license: 'CC0-1.0',
  title: "Dust protection screen",
  description: "Portable low dust screen with three panels, side rails and broad floor skids. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#89877e", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("dust-protection-screen");
p.part("panel-0",b(-360,0,390,320,45,780).color(color));
p.part("panel-1",b(0,0,390,320,45,780).color(color));
p.part("panel-2",b(360,0,390,320,45,780).color(color));
p.part("top-rail",b(0,0,800,1080,65,55).color(color));
p.part("bottom-rail",b(0,0,15,1080,65,30).color(color));
p.part("skid-left",b(-360,0,0,180,500,50).color(color));
p.part("skid-right",b(360,0,0,180,500,50).color(color));

return p.model();
