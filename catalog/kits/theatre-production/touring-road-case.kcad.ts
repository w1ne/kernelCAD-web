// SPDX-License-Identifier: CC0-1.0
// Touring road case: Touring flight case with reinforced corners, recessed pull handles, metal latches and four exposed low-profile caster wheels.

meta({
  name: "touring-road-case",
  license: 'CC0-1.0',
  title: "Touring road case",
  description: "Touring flight case with reinforced corners, recessed pull handles, metal latches and four exposed low-profile caster wheels. Knobs: overall scale; polymer controls and cable jacket, aluminum, steel hardware, rubber and isolation pads; houseShow and touring appearance presets.",
  tags: ['theatre production', 'stagecraft', 'performing arts', 'low poly', 'scene prop'],
  kit: 'theatre-production',
  category: 'prop',
  origin: "base",
  compat: ['theatre', 'theater', 'stagecraft', 'performing-arts', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const polymer = param('polymer', '#426878', { label: 'Polymer controls and cable jacket' });
const aluminum = param('aluminum', '#bac3c6', { label: 'Aluminum' });
const hardware = param('hardware', '#c28f3e', { label: 'Steel hardware' });
const rubber = param('rubber', '#272a2d', { label: 'Rubber and isolation pads' });

presets({
  houseShow: {
    polymer: '#344e5b',
    aluminum: '#c7cecf',
    hardware: '#c5a052',
    rubber: '#222629',
  },
  touring: {
    polymer: '#e3a928',
    aluminum: '#dce3e2',
    hardware: '#e2b347',
    rubber: '#25292c',
  },
});

const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const p = assembly("touring-road-case");
p.part("case-shell", b(0,0,100,900,650,850).color(polymer));
p.part("lid", b(0,0,950,920,670,90).color(polymer));
p.part("front-rail", b(0,-330,80,860,35,75).color(aluminum));
p.part("back-rail", b(0,330,80,860,35,75).color(aluminum));
p.part("left-corner", b(-440,0,100,55,620,850).color(hardware));
p.part("right-corner", b(440,0,100,55,620,850).color(hardware));
p.part("handle-left", b(-460,-150,430,60,60,180).color(hardware));
p.part("handle-right", b(460,-150,430,60,60,180).color(hardware));
p.part("latch-left", b(-260,-350,780,90,45,100).color(hardware));
p.part("latch-right", b(260,-350,780,90,45,100).color(hardware));


p.part("caster-plate-front-left", b(-430, -285, 65, 120, 80, 45).color(hardware));
p.part("caster-wheel-front-left", cylinder(70, 58, 10).rotateX(90).translate(-430, -300, 58).scale(scale).color(rubber));
p.part("caster-plate-back-left", b(-430, 285, 65, 120, 80, 45).color(hardware));
p.part("caster-wheel-back-left", cylinder(70, 58, 10).rotateX(-90).translate(-430, 300, 58).scale(scale).color(rubber));
p.part("caster-plate-front-right", b(430, -285, 65, 120, 80, 45).color(hardware));
p.part("caster-wheel-front-right", cylinder(70, 58, 10).rotateX(90).translate(430, -300, 58).scale(scale).color(rubber));
p.part("caster-plate-back-right", b(430, 285, 65, 120, 80, 45).color(hardware));
p.part("caster-wheel-back-right", cylinder(70, 58, 10).rotateX(-90).translate(430, 300, 58).scale(scale).color(rubber));

return p.model();
