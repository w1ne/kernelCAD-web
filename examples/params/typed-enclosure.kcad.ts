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
// REAL captured output (this file, as committed — verified via both the CLI
// `evaluate` subcommand AND the MCP `evaluate_script`/`set_param`/`inspect`
// tools called with inline `{ code }`; both paths install the same node
// host-fs capability that `sketch.text`'s font loader needs, so inline
// `code` works exactly like `file` here — no `cli.host-fs-unavailable`):
//
//   defaults (HasLid=true, Screw=M4, Label=KCAD):  Features: 6
//   HasLid=false:                                  Features: 5  (lid chamfer feature dropped)
//   Screw=M5 (hole diameter 4.5mm -> 5.5mm):        Features: 6
//   Label=PROTO (engraved text content changes):    Features: 6
//
// Try different values to see each typed param at work:
//   set_param({ code, param_name: 'HasLid', new_value: false })   -> lid chamfer disappears (Features: 6 -> 5)
//   set_param({ code, param_name: 'Screw', new_value: 'M5' })     -> mounting hole widens to 5.5mm
//   set_param({ code, param_name: 'Label', new_value: 'PROTO' })  -> engraved text changes
//
// set_param REJECTS a mismatched value before touching the source (no
// new_code, ok: false) — e.g. new_value: 'yes' for HasLid, new_value: 42 for
// Label, or new_value: 'M9' for Screw all fail with a
// `invalid-args.param.type-mismatch` / `invalid-args.param.choice-invalid`
// error. See tests/unit/mcp/tools/setParamValue.test.ts for the exact
// rejection assertions.

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
  body = body.chamfer(1, { face: 'top' });
}

const text = sketch
  .text(label.value, { size: 6, align: 'center', position: [0, 0] })
  .extrude(0.6)
  .rotate([1, 0, 0], 90)
  .translate(0, -depth / 2 - 0.6, height / 2)
  .color('#222222');

return body.union(text);
