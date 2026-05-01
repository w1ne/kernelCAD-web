const span = param('Span', 200, { unit: 'mm', min: 50, max: 1000 });
const rootChord = param('RootChord', 80, { unit: 'mm', min: 20, max: 200 });
const tipChord = param('TipChord', 20, { unit: 'mm', min: 5, max: 100 });

// Simple swept wing: 4 ribs interpolated along the span. Ribs are
// rectangular for simplicity (real airfoils use sagittaArc / radiusArc
// for camber — defer to a more elaborate fixture).
function rib(chord: number) {
  const thickness = chord * 0.12;  // 12% thickness ratio (NACA-ish proportion)
  return path()
    .moveTo(0, -thickness / 2)
    .lineTo(chord, -thickness / 2)
    .tangentArc(chord + thickness * 0.3, 0)
    .tangentArc(chord, thickness / 2)
    .lineTo(0, thickness / 2)
    .close();
}

const root = rib(rootChord);
const r25 = rib(rootChord * 0.75 + tipChord * 0.25);
const r50 = rib(rootChord * 0.5 + tipChord * 0.5);
const tip = rib(tipChord);

return root.loft([r25, r50, tip], { spacing: span / 3 });
