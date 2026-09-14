// examples/params/typed-enclosure.kcad.ts
//
// Typed script params: boolean, choice, string — beyond the numeric-only
// `param()` of prior slices. Demonstrates all three, live-editable via
// `set_param` / the Studio params panel.
//
// Run with:
//   npx tsx dist/cli/index.js evaluate examples/params/typed-enclosure.kcad.ts
// (or, from a dev checkout: npx tsx src/agent/cli/index.ts evaluate ...)
//
// Try different values to see each typed param at work:
//   set_param({ code, param_name: 'HasLid', new_value: false })   -> lid chamfer disappears
//   set_param({ code, param_name: 'Screw', new_value: 'M5' })     -> mounting hole widens to 5.5mm
//   set_param({ code, param_name: 'Label', new_value: 'PROTO' })  -> engraved text changes

const width = 60;
const depth = 40;
const height = 20;

// Boolean param: adds/removes a feature (a lid chamfer) when toggled.
const hasLid = param('HasLid', true, { description: 'chamfer the top edge as a lid seat' });

// Choice param: M3/M4/M5 mapped to a real hole diameter lookup — the
// canonical "choice drives a dimension" pattern.
const screw = param('Screw', 'M4', {
  choices: ['M3', 'M4', 'M5'],
  description: 'mounting screw size',
});
const screwHoleDiameterMm: Record<string, number> = { M3: 3.4, M4: 4.5, M5: 5.5 };

// String param: drives engraved sketch.text content on the front face.
const label = param('Label', 'KCAD', { maxLength: 24, description: 'front-face label text' });

let body = box(width, depth, height)
  .hole('top', {
    u: -width / 2 + 10,
    v: -depth / 2 + 10,
    diameter: screwHoleDiameterMm[screw.value],
    depth: 'through',
    name: 'mountScrew',
  });

if (hasLid.value) {
  body = body.chamfer('top', 1);
}

const text = sketch
  .text(label.value, { size: 6, align: 'center', position: [0, 0] })
  .extrude(0.6)
  .rotate([1, 0, 0], 90)
  .translate(0, -depth / 2 - 0.6, height / 2)
  .color('#222222');

return body.union(text);
