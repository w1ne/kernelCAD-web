// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "powered-sack-dumper",
  license: 'CC0-1.0',
  title: "Powered sack dumper",
  description: "Tilting-looking sack cradle on a guarded lift frame with a broad floor base. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#62777c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("powered-sack-dumper");
p.part("base", b(0,0,0,900,720,90).color(color));
p.part("left-upright", b(-360,0,90,55,55,1250).color(color));
p.part("right-upright", b(360,0,90,55,55,1250).color(color));
p.part("top-beam", b(0,0,1280,780,65,75).color(color));
p.part("cradle-platform", b(0,100,650,620,520,75).color(color));
p.part("back-plate", b(0,350,720,620,60,620).color(color));
p.part("left-side", b(-300,100,720,55,520,360).color(color));
p.part("right-side", b(300,100,720,55,520,360).color(color));
p.part("actuator-left", b(-220,-180,120,70,70,600).color(color));
p.part("actuator-right", b(220,-180,120,70,70,600).color(color));
p.part("control-post", b(510,-160,0,60,60,800).color(color));
p.part("control-head", b(510,-160,800,190,110,130).color(color));

return p.model();
