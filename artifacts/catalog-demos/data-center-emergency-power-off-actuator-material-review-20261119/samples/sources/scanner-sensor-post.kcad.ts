// SPDX-License-Identifier: CC0-1.0
// Scanner sensor post: Floor-mounted scanner mast with a short arm, compact reader block and cable housing. Low-poly visualization geometry in millimetres, Z up.

meta({
  name: "scanner-sensor-post",
  license: 'CC0-1.0',
  title: "Scanner sensor post",
  description: "Floor-mounted scanner mast with a short arm, compact reader block and cable housing. Scale, painted steel, structural steel, instrument glass, and weathered or highVisibility finish presets are editable.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#566f83', { label: 'Painted steel' });
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

const p = assembly("scanner-sensor-post");
p.part("foot", b(0,0,0,260,260,70).color(structuralSteel));
p.part("mast", b(0,0,70,85,85,1120).color(paintedSteel));
p.part("arm", b(90,0,980,300,70,60).color(paintedSteel));
p.part("sensor", b(235,0,890,210,160,130).color(paintedSteel));
p.part("lens", b(235,-86,900,125,18,70).color(instrumentGlass));
p.part("junction-box", b(-120,0,570,130,155,190).color(paintedSteel));
p.part("cable-gland", b(-120,-86,600,65,35,45).color(paintedSteel));
p.part("anchor-left", b(-85,-90,0,55,55,50).color(paintedSteel));
p.part("anchor-right", b(85,90,0,55,55,50).color(paintedSteel));

return p.model();
