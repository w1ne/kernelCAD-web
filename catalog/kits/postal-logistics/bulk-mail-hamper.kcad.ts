// SPDX-License-Identifier: CC0-1.0
// Bulk mail hamper: Large open hamper with reinforced corners, removable liner and low handling skids. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "bulk-mail-hamper",
  license: 'CC0-1.0',
  title: "Bulk mail hamper",
  description: "Large open hamper with reinforced corners, removable liner and low handling skids. Scale, painted steel, timber, structural steel, woven fabric, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5b737e', { label: 'Painted steel' });
const timber = param('timber', '#876c4b', { label: 'Timber' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const fabric = param('fabric', '#476b7d', { label: 'Woven fabric' });
presets({
  weathered: { paintedSteel: '#68777a', timber: '#71614b', structuralSteel: '#67675f', fabric: '#6c6b60' },
  highVisibility: { paintedSteel: '#e36d32', timber: '#a27e44', structuralSteel: '#454f54', fabric: '#d66a35' },
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

const p = assembly("bulk-mail-hamper");
p.part("base", b(0,0,0,760,620,80).color(structuralSteel));
p.part("front-wall", b(0,-280,80,760,55,630).color(paintedSteel));
p.part("back-wall", b(0,280,80,760,55,630).color(paintedSteel));
p.part("left-wall", b(-350,0,80,55,520,630).color(paintedSteel));
p.part("right-wall", b(350,0,80,55,520,630).color(paintedSteel));
p.part("liner", b(0,0,145,650,510,510).color(fabric));
p.part("corner-a", b(-360,-290,80,45,45,650).color(paintedSteel));
p.part("corner-b", b(360,-290,80,45,45,650).color(paintedSteel));
p.part("corner-c", b(-360,290,80,45,45,650).color(paintedSteel));
p.part("corner-d", b(360,290,80,45,45,650).color(paintedSteel));
p.part("skid-left", b(-230,0,0,90,590,55).color(timber));
p.part("skid-right", b(230,0,0,90,590,55).color(timber));

return p.model();
