// SPDX-License-Identifier: CC0-1.0
// Overhead scan gantry: Low scan gantry with twin camera heads, side posts and an integrated parcel conveyor. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "overhead-scan-gantry",
  license: 'CC0-1.0',
  title: "Overhead scan gantry",
  description: "Low scan gantry with twin camera heads, side posts and an integrated parcel conveyor. Scale, painted steel, structural steel, instrument glass, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#5c7685', { label: 'Painted steel' });
const structuralSteel = param('structuralSteel', '#58656c', { label: 'Structural steel' });
const instrumentGlass = param('instrumentGlass', '#57b4c3', { label: 'Instrument glass' });
presets({
  weathered: { paintedSteel: '#68777a', structuralSteel: '#67675f', instrumentGlass: '#548a91' },
  highVisibility: { paintedSteel: '#e36d32', structuralSteel: '#454f54', instrumentGlass: '#6bd0dc' },
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

const p = assembly("overhead-scan-gantry");
p.part("base-bed", b(0,0,650,720,980,65).color(structuralSteel));
p.part("post-left", b(-330,-160,0,50,50,650).color(structuralSteel));
p.part("post-right", b(330,-160,0,50,50,650).color(structuralSteel));
p.part("post-left-back", b(-330,160,0,50,50,650).color(structuralSteel));
p.part("post-right-back", b(330,160,0,50,50,650).color(structuralSteel));
p.part("gantry-front", b(0,-160,620,720,60,70).color(paintedSteel));
p.part("gantry-back", b(0,160,620,720,60,70).color(paintedSteel));
p.part("camera-a", b(-155,0,1260,170,170,125).color(instrumentGlass));
p.part("camera-b", b(155,0,1260,170,170,125).color(instrumentGlass));
p.part("side-camera-left", b(-290,0,930,55,130,150).color(instrumentGlass));
p.part("side-camera-right", b(290,0,930,55,130,150).color(instrumentGlass));
p.part("status-box", b(390,0,430,100,150,190).color(paintedSteel));

return p.model();
