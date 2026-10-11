// examples/params/color-enclosure.kcad.ts
//
// Colour params: a string param whose default is a hex colour ('#rrggbb' or
// '#rgb', no `choices`) is a COLOUR param. The Studio customizer shows a
// colour picker plus a hex field for it; the value is always '#rrggbb'.
// Pass the ref straight to `.color(ref)` or `.finish(token, { color: ref })`.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/params/color-enclosure.kcad.ts
//
// Try:
//   set_param({ code, param_name: 'BaseColor', new_value: '#ff8800' })  -> base turns orange
//   set_param({ code, param_name: 'LidColor', new_value: 'navy' })      -> written back as '#000080'
//   set_param({ code, param_name: 'LidColor', new_value: 'blurple' })   -> rejected (type-mismatch)

const baseColor = param('BaseColor', '#3366cc', { label: 'Base colour', description: 'housing paint' });
const lidColor = param('LidColor', '#e0e0e0', { label: 'Lid colour', description: 'ABS lid tint' });

const base = box(60, 40, 18).color(baseColor);
const lid = box(60, 40, 3).translate(0, 0, 18).finish('abs', { color: lidColor });

return assembly('enclosure')
  .part('base', base)
  .part('lid', lid);
