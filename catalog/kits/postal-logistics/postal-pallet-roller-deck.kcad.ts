// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-pallet-roller-deck",
  license: 'CC0-1.0',
  title: "Postal pallet roller deck",
  description: "Heavy parcel transfer deck with continuous rollers, raised end stops and forklift-clear base. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a7876", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-pallet-roller-deck");
p.part("deck-frame", b(0,0,360,1180,1000,110).color(color));
p.part("left-side", b(-560,0,415,48,1000,65).color(color));
p.part("right-side", b(560,0,415,48,1000,65).color(color));
p.part("roller-a", b(0,-420,415,1080,40,32).color(color));
p.part("roller-b", b(0,-210,415,1080,40,32).color(color));
p.part("roller-c", b(0,0,415,1080,40,32).color(color));
p.part("roller-d", b(0,210,415,1080,40,32).color(color));
p.part("roller-e", b(0,420,415,1080,40,32).color(color));
p.part("fork-channel-left", b(-300,0,0,150,960,190).color(color));
p.part("fork-channel-right", b(300,0,0,150,960,190).color(color));
p.part("end-stop-front", b(0,-495,470,1080,45,110).color(color));
p.part("end-stop-back", b(0,495,470,1080,45,110).color(color));

return p.model();
