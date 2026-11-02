// Original kernelCAD touring board with a removable center fin and deck grip pad.

meta({
  name: 'paddleboard', license: 'CC0-1.0', title: 'Stand-up paddleboard',
  description: 'Long touring paddleboard with a tapered nose, textured standing pad, carry loop and optional fin. Knobs: length, fin, board, pad and accent colours.',
  tags: ['paddleboard', 'SUP', 'stand-up paddle', 'watercraft', 'lake', 'coastal'], kit: 'watercraft', category: 'vehicle', origin: 'base',
  compat: ['water', 'lake', 'coastal', 'outdoor'], triangleBudget: 320,
});

const length = param('length', '3000', { choices: ['2600', '3000', '3400'], label: 'Board length (mm)' });
const fin = param('fin', 'single', { choices: ['single', 'twin'], label: 'Fin setup' });
const board = param('board', '#e8e1c6', { label: 'Board' });
const pad = param('pad', '#328399', { label: 'Deck pad' });
const accent = param('accent', '#e06a38', { label: 'Nose and leash' });
presets({ lagoon: { board: '#e8e1c6', pad: '#328399' }, sunset: { board: '#e6a94f', pad: '#313f55' } });

const L = Number(length.value);
const W = L * 0.29;
const outline = (l: number, w: number, depth: number, z: number) => extrudePolygon([
  [0, l / 2], [w * 0.28, l * 0.42], [w / 2, l * 0.25], [w * 0.48, -l * 0.28],
  [w * 0.35, -l * 0.44], [0, -l / 2], [-w * 0.35, -l * 0.44], [-w * 0.48, -l * 0.28],
  [-w / 2, l * 0.25], [-w * 0.28, l * 0.42],
], depth).translate(0, 0, z);
const boardAssembly = assembly('paddleboard');
boardAssembly.part('board-shell', outline(L, W, 48, 0).color(board));
boardAssembly.part('standing-pad', outline(L * 0.47, W * 0.68, 12, 48).translate(0, -L * 0.07, 0).color(pad));
boardAssembly.part('nose-mark', box(W * 0.34, 74, 14, true).translate(0, L * 0.36, 55).color(accent));
boardAssembly.part('carry-loop', cylinder(18, 32, 8).subtract(cylinder(20, 20, 8).translate(0, 0, -1)).translate(0, -L * 0.36, 48).color(accent));
const finOffsets = fin.value === 'single' ? [0] : [-W * 0.18, W * 0.18];
for (const [index, x] of finOffsets.entries()) {
  boardAssembly.part('fin-' + (index + 1), box(20, 110, 72, true).translate(x, -L * 0.36, 36).color(pad));
}
return boardAssembly.model();
