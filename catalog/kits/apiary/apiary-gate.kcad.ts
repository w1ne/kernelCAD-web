// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "apiary-gate",
  license: 'CC0-1.0',
  title: "Apiary gate",
  description: "Simple yard gate with two posts, cross rails and a hinged-looking framed panel. Knobs: overall scale, timber, hardware and panel paint.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

// Separate material knobs, so the gate reads as timber with metal hardware and
// a painted panel rather than one flat colour. This is the difference between a
// silhouette and a shape you can recognise.
const timber = param('timber', "#7e765f", { label: 'Timber' });
const hardware = param('hardware', "#4a4a4e", { label: 'Hardware' });
const panel = param('panel', "#8a9a7a", { label: 'Panel paint' });

presets({
  weathered: { timber: '#6f6852', hardware: '#5a544c', panel: '#7d8a6c' },
  creosoted: { timber: '#4f4a3c', hardware: '#3a3a3e', panel: '#5f6b54' },
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("apiary-gate");

// Posts carry the weight, so they are the darkest timber.
p.part("post-left",b(-500,0,0,75,75,1120).color(timber));
p.part("post-right",b(500,0,0,75,75,1120).color(timber));

// The framed panel is a flat infill the gate swings on.
p.part("panel",b(0,0,150,880,30,760).color(panel));

// Rails and braces are the lighter structural timber.
p.part("gate-top",b(0,0,945,980,55,55).color(timber));
p.part("gate-bottom",b(0,0,85,980,55,55).color(timber));
p.part("gate-rail-a",b(0,0,315,900,45,45).color(timber));
p.part("gate-rail-b",b(0,0,615,900,45,45).color(timber));
p.part("gate-brace",b(0,0,65,50,60,850).color(timber));

// Post caps read as metal end-grain protection.
p.part("post-cap-left",b(-500,0,1120,110,110,35).color(hardware));
p.part("post-cap-right",b(500,0,1120,110,110,35).color(hardware));

// Hinges are the small metal details that make the swing legible.
p.part("hinge-lower",b(-460,0,260,70,90,55).color(hardware));
p.part("hinge-upper",b(-460,0,820,70,90,55).color(hardware));

// Latch on the closing edge.
p.part("latch",b(455,0,540,60,80,90).color(hardware));

return p.model();
