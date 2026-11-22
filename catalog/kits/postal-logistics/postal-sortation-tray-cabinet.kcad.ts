// SPDX-License-Identifier: CC0-1.0
// Postal sortation tray cabinet: Tall cabinet with stacked tray openings, central dividers and a low stabilizing plinth. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "postal-sortation-tray-cabinet",
  license: 'CC0-1.0',
  title: "Postal sortation tray cabinet",
  description: "Tall cabinet with stacked tray openings, central dividers and a low stabilizing plinth. Scale, structural steel, stainless steel, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#627a7a', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#bbc4c4', { label: 'Stainless steel' });
presets({
  weathered: { structuralSteel: '#67675f', stainlessSteel: '#9ea7a6' },
  highVisibility: { structuralSteel: '#454f54', stainlessSteel: '#d9e0de' },
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

const p = assembly("postal-sortation-tray-cabinet");
p.part("plinth", b(0,0,0,850,520,100).color(structuralSteel));
p.part("left-side", b(-390,0,100,60,520,1350).color(structuralSteel));
p.part("right-side", b(390,0,100,60,520,1350).color(structuralSteel));
p.part("top", b(0,0,1450,850,520,70).color(structuralSteel));
p.part("back", b(0,230,150,720,40,1280).color(structuralSteel));
p.part("shelf-a", b(0,0,360,720,450,45).color(structuralSteel));
p.part("shelf-b", b(0,0,650,720,450,45).color(structuralSteel));
p.part("shelf-c", b(0,0,940,720,450,45).color(structuralSteel));
p.part("shelf-d", b(0,0,1230,720,450,45).color(structuralSteel));
p.part("divider-a", b(-180,0,380,25,440,270).color(structuralSteel));
p.part("divider-b", b(180,0,670,25,440,270).color(structuralSteel));
p.part("divider-c", b(-180,0,960,25,440,270).color(structuralSteel));
p.part("divider-d", b(180,0,1250,25,440,270).color(stainlessSteel));

return p.model();
