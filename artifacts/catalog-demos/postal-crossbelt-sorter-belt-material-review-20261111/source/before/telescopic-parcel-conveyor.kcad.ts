// SPDX-License-Identifier: CC0-1.0
// Telescopic parcel conveyor: Extending conveyor boom on an adjustable support frame with wheel blocks and nested belt sections. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "telescopic-parcel-conveyor",
  license: 'CC0-1.0',
  title: "Telescopic parcel conveyor",
  description: "Extending conveyor boom on an adjustable support frame with wheel blocks and nested belt sections. Scale, painted steel, structural steel, rubber, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#547582', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const rubber = param('rubber', '#30373b', { label: 'Rubber' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', rubber: '#3d3d39' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', rubber: '#252b2e' },
});
const octRect = (w:number,d:number,cut:number) => path()
  .moveTo(-w/2+cut,-d/2).lineTo(w/2-cut,-d/2).lineTo(w/2,-d/2+cut)
  .lineTo(w/2,d/2-cut).lineTo(w/2-cut,d/2).lineTo(-w/2+cut,d/2)
  .lineTo(-w/2,d/2-cut).lineTo(-w/2,-d/2+cut).close();
const bevelled = (w:number,d:number,h:number) => {
  const edge = Math.min(w,d,h) * 0.08;
  const profiles = [
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w,d,Math.min(w,d)*0.08),
    octRect(w-edge*2,d-edge*2,Math.min(w-edge*2,d-edge*2)*0.08),
  ];
  const levels = [0,edge,h-edge,h];
  return profiles[0].loft(profiles.slice(1), {
    planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })),
    ruled: true,
  });
};
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => bevelled(w,d,h).translate(x,y,z).scale(scale);
const tiltedX = (x:number,y:number,z:number,w:number,d:number,h:number,a:number) => bevelled(w,d,h).translate(0,0,-h/2).rotateX(a).translate(x,y,z+h/2).scale(scale);

const p = assembly("telescopic-parcel-conveyor");
p.part("base-frame", b(0,0,0,760,700,95).color(structuralSteel));
p.part("lower-boom", tiltedX(0,100,720,620,980,70,5).color(paintedSteel));
p.part("middle-boom", tiltedX(0,390,850,540,800,55,5).color(paintedSteel));
p.part("inner-boom", tiltedX(0,650,960,470,600,45,5).color(paintedSteel));
p.part("left-support", b(-300,-180,95,55,55,600).color(structuralSteel));
p.part("right-support", b(300,-180,95,55,55,600).color(structuralSteel));
p.part("crossbar", b(0,-180,650,660,70,55).color(structuralSteel));
p.part("left-wheel", b(-345,-230,0,110,65,130).color(rubber));
p.part("right-wheel", b(345,-230,0,110,65,130).color(rubber));
p.part("control-box", b(370,-80,350,90,120,160).color(paintedSteel));

return p.model();
