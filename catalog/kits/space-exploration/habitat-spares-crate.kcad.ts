// SPDX-License-Identifier: CC0-1.0
// Original low-poly space exploration prop, millimetres, Z up, base at z = 0.

meta({
  name: "habitat-spares-crate",
  license: 'CC0-1.0',
  title: "Habitat spares crate",
  description: "Stackable spares crate with reinforced corner rails, lid seam and side hand slots. Knobs: overall scale and asset color.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#9a8a68", { label: 'Asset color' });
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("habitat-spares-crate");
p.part("body",b(0,0,0,800,650,520).color(color));
p.part("lid",b(0,0,540,840,690,70).color(color));
p.part("corner--340--265",b(-340,-265,10,70,70,570).color(color));
p.part("corner--340-265",b(-340,265,10,70,70,570).color(color));
p.part("corner-340--265",b(340,-265,10,70,70,570).color(color));
p.part("corner-340-265",b(340,265,10,70,70,570).color(color));
p.part("slot-left",b(-405,-10,230,18,210,80).color(color));
p.part("slot-right",b(405,-10,230,18,210,80).color(color));

return p.model();
