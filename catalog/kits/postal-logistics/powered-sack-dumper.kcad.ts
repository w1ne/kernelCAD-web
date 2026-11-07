// SPDX-License-Identifier: CC0-1.0
// Powered sack dumper: Tilting-looking sack cradle on a guarded lift frame with a broad floor base. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "powered-sack-dumper",
  license: 'CC0-1.0',
  title: "Powered sack dumper",
  description: "Tilting-looking sack cradle on a guarded lift frame with a broad floor base. Scale, painted steel, structural steel, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#62777c', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', stainlessSteel: '#9ea7a6' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', stainlessSteel: '#d9e0de' },
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

const p = assembly("powered-sack-dumper");
p.part("base", b(0,0,0,900,720,90).color(structuralSteel));
p.part("left-upright", b(-360,0,90,55,55,1250).color(structuralSteel));
p.part("right-upright", b(360,0,90,55,55,1250).color(structuralSteel));
p.part("top-beam", b(0,0,1280,780,65,75).color(structuralSteel));
p.part("cradle-platform", b(0,100,650,620,520,75).color(paintedSteel));
p.part("back-plate", b(0,350,720,620,60,620).color(paintedSteel));
p.part("left-side", b(-300,100,720,55,520,360).color(paintedSteel));
p.part("right-side", b(300,100,720,55,520,360).color(paintedSteel));
p.part("actuator-left", b(-220,-180,120,70,70,600).color(stainlessSteel));
p.part("actuator-right", b(220,-180,120,70,70,600).color(stainlessSteel));
p.part("control-post", b(510,-160,0,60,60,800).color(structuralSteel));
p.part("control-head", b(510,-160,800,190,110,130).color(stainlessSteel));

return p.model();
