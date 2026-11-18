// SPDX-License-Identifier: CC0-1.0
// Lamella plate clarifier: Rectangular clarifier with inclined lamella plates supported by side rails, an inlet compartment, and a collection trough. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "lamella-clarifier",
  license: 'CC0-1.0',
  title: "Lamella plate clarifier",
  description: "Rectangular clarifier with inclined lamella plates supported by side rails, an inlet compartment, and a collection trough. Parameters: overall scale and concrete, structural steel, stainless steel; weathered and highVisibility presets.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const concrete = param('concrete', '#b8b1a1', { label: 'Concrete' });
const structuralSteel = param('structuralSteel', '#68777b', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b5c0c0', { label: 'Stainless steel' });
presets({
  weathered: { concrete: '#9b9587', structuralSteel: '#6e6b63', stainlessSteel: '#9ca7a6' },
  highVisibility: { concrete: '#c6bdac', structuralSteel: '#505b60', stainlessSteel: '#e1ddd0' },
});
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const tiltedPanel=(x:number,y:number,z:number,w:number,d:number,h:number,angle:number)=>box(w,d,h,true).rotateY(angle).translate(x,y,z+h/2).scale(scale);

const p=assembly("lamella-clarifier");
p.part("tank-floor",b(0,0,0,1100,680,40).color(concrete));
p.part("wall-left",b(0,-320,20,1100,40,360).color(concrete));
p.part("wall-right",b(0,320,20,1100,40,360).color(concrete));
p.part("plate-pack-side-left",b(0,-185,230,640,30,250).color(structuralSteel));
p.part("plate-pack-side-right",b(0,185,230,640,30,250).color(structuralSteel));
p.part("plate-0",tiltedPanel(-250,0,250,28,380,250,18).color(stainlessSteel));
p.part("plate-1",tiltedPanel(-165,0,250,28,380,250,18).color(stainlessSteel));
p.part("plate-2",tiltedPanel(-80,0,250,28,380,250,18).color(stainlessSteel));
p.part("plate-3",tiltedPanel(5,0,250,28,380,250,18).color(stainlessSteel));
p.part("plate-4",tiltedPanel(90,0,250,28,380,250,18).color(stainlessSteel));
p.part("plate-5",tiltedPanel(175,0,250,28,380,250,18).color(stainlessSteel));
p.part("inlet-box",b(-460,0,160,150,580,220).color(stainlessSteel));
p.part("launder",b(450,0,360,80,720,60).color(concrete));

return p.model();
