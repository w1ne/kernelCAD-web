// Original kernelCAD low-poly toolbox: a steel box with a ridged lid, side
// latches and a carry handle, or an open wooden tote with tools sticking up.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, long side along X.

meta({
  name: 'toolbox',
  license: 'CC0-1.0',
  title: 'Toolbox',
  description: 'Metal toolbox with a carry handle and latches, or an open wooden tool tote holding a hammer and saw handles. Knobs: style, size, body, handle and trim colours.',
  tags: ['toolbox', 'tools', 'tool chest', 'workshop', 'garage', 'repair', 'hand tools'],
  kit: 'props',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'workshop', 'garage', 'warehouse'],
  triangleBudget: 300,
});

const style = param('style', 'metal', { choices: ['metal', 'tote'], label: 'Style' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const body = param('body', '#c62f27', { label: 'Body' });
const handle = param('handle', '#2b2b2d', { label: 'Handle' });
const trim = param('trim', '#b8bcc0', { label: 'Latches and tools' });

presets({
  blue: { body: '#2a5fa8' },
  yellow: { body: '#e3b41f', handle: '#232323' },
  wooden: { style: 'tote', body: '#b08050', handle: '#7a5434' },
});

const s = size.value === 'small' ? 0.75 : size.value === 'large' ? 1.3 : 1;
const L = 480 * s;
const W = 220 * s;
const H = 200 * s;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const tb = assembly('toolbox');
if (style.value === 'metal') {
  tb.part('box', blk(-L / 2, -W / 2, 0, L / 2, W / 2, H).color(body));
  // Lid with a raised ridge along the top.
  tb.part('lid', blk(-L / 2 - 6, -W / 2 - 6, H, L / 2 + 6, W / 2 + 6, H + 45 * s)
    .union(extrudePolygon([[-W / 2 - 6, 0], [W / 2 + 6, 0], [W * 0.18, 30 * s], [-W * 0.18, 30 * s]], L * 0.94)
      .rotateX(90).rotateZ(90).translate(-L * 0.47, 0, H + 44 * s))
    .color(body));
  // Handle: two posts and a grip bar.
  const hz = H + 74 * s;
  tb.part('handle', blk(-L * 0.28, -12 * s, hz - 2, -L * 0.24, 12 * s, hz + 60 * s)
    .union(blk(L * 0.24, -12 * s, hz - 2, L * 0.28, 12 * s, hz + 60 * s))
    .union(blk(-L * 0.28, -16 * s, hz + 45 * s, L * 0.28, 16 * s, hz + 75 * s))
    .color(handle));
  for (const [i, x] of [[1, -L * 0.3], [2, L * 0.3]] as [number, number][]) {
    tb.part(`latch-${i}`, blk(x - 25 * s, -W / 2 - 14, H - 45 * s, x + 25 * s, -W / 2 + 1, H + 20 * s).color(trim));
  }
} else {
  // Open tote: floor, two sides, two gabled ends and a dowel handle.
  const t = 16 * s;
  const endH = H * 1.9;
  tb.part('box', blk(-L / 2, -W / 2, 0, L / 2, W / 2, t)
    .union(blk(-L / 2, -W / 2, 0, L / 2, -W / 2 + t, H * 0.6))
    .union(blk(-L / 2, W / 2 - t, 0, L / 2, W / 2, H * 0.6))
    .union(extrudePolygon([[-W / 2, 0], [W / 2, 0], [W / 2, H * 0.6], [W * 0.15, endH], [-W * 0.15, endH], [-W / 2, H * 0.6]], t)
      .rotateX(90).rotateZ(90).translate(-L / 2, 0, 0))
    .union(extrudePolygon([[-W / 2, 0], [W / 2, 0], [W / 2, H * 0.6], [W * 0.15, endH], [-W * 0.15, endH], [-W / 2, H * 0.6]], t)
      .rotateX(90).rotateZ(90).translate(L / 2 - t, 0, 0))
    .color(body));
  tb.part('handle', cylinder(L - 2 * t + 4, 14 * s, 6).rotateY(90).translate(-L / 2 + t - 2, 0, endH - 40 * s).color(handle));
  // Tool handles poking out: hammer, saw grip, screwdriver.
  tb.part('hammer', blk(-L * 0.35, -W * 0.3, t - 1, -L * 0.3, -W * 0.18, H * 1.4)
    .union(blk(-L * 0.4, -W * 0.36, H * 1.4 - 2, -L * 0.25, -W * 0.12, H * 1.4 + 35 * s)).color(trim));
  tb.part('saw', blk(L * 0.1, W * 0.12, t - 1, L * 0.3, W * 0.22, H * 1.2).color(handle));
  tb.part('screwdriver', cylinder(H * 1.3, 12 * s, 5).translate(-L * 0.05, -W * 0.2, t - 1).color(trim));
}

return tb.model();
