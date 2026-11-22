// SPDX-License-Identifier: CC0-1.0
// Habitat spares crate: Stackable spares crate with reinforced corner rails, lid seam and side hand slots. Stylized visualization geometry in millimetres, Z up.

meta({
  name: "habitat-spares-crate",
  license: 'CC0-1.0',
  title: "Habitat spares crate",
  description: "Stackable spares crate with reinforced corner rails, lid seam and side hand slots. Material controls: paint, aluminum, polymer; named lunarDust and highVisibility presets.",
  tags: ['space', 'exploration', 'lunar', 'low poly', 'scene prop'],
  kit: 'space-exploration',
  category: 'prop',
  origin: 'base',
  compat: ['space', 'science', 'exploration', 'scene'],
  triangleBudget: 752,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paint = param('paint', "#9a8a68", { label: "Painted shell" });
const aluminum = param('aluminum', "#b6bdbe", { label: "Bare aluminum" });

const polymer = param('polymer', "#536c76", { label: "Polymer corner guards" });

presets({
  lunarDust: {"paint": "#c9c3b5", "aluminum": "#c3c5c3", "polymer": "#7a8279"},
  highVisibility: {"paint": "#d86e35", "aluminum": "#d8b255", "polymer": "#d4a63f"},
});

const octRect = (w: number, d: number, c: number) => path().moveTo(-w/2+c,-d/2).lineTo(w/2-c,-d/2).lineTo(w/2,-d/2+c).lineTo(w/2,d/2-c).lineTo(w/2-c,d/2).lineTo(-w/2+c,d/2).lineTo(-w/2,d/2-c).lineTo(-w/2,-d/2+c).close();
const boxShape = (w: number, d: number, h: number) => {
  const bevel = Math.min(w,d,h) * 0.06;
  const levels = [-h/2,-h/2+bevel,h/2-bevel,h/2];
  const insets = [bevel,0,0,bevel];
  const profiles = levels.map((_,i) => octRect(w-2*insets[i],d-2*insets[i],Math.min(w-2*insets[i],d-2*insets[i])*0.06));
  return profiles[0].loft(profiles.slice(1), { planes: levels.map((z) => ({ plane: 'XY' as const, origin: [0,0,z] as [number,number,number] })), ruled: true });
};
const b = (x: number,y: number,z: number,w: number,d: number,h: number) => boxShape(w,d,h).translate(x,y,z+h/2).scale(scale);

const p = assembly("habitat-spares-crate");
p.part("body",b(0,0,0,800,650,520).color(aluminum));
p.part("lid",b(0,0,540,840,690,70).color(paint));
p.part("corner--340--265",b(-340,-265,10,70,70,570).color(polymer));
p.part("corner--340-265",b(-340,265,10,70,70,570).color(polymer));
p.part("corner-340--265",b(340,-265,10,70,70,570).color(polymer));
p.part("corner-340-265",b(340,265,10,70,70,570).color(polymer));
p.part("slot-left",b(-405,-10,230,18,210,80).color(paint));
p.part("slot-right",b(405,-10,230,18,210,80).color(paint));

return p.model();
