// examples/params/asset-manifest-mounting-plate.kcad.ts
// A small original kernelCAD model exercising typed knob declarations,
// asset metadata, presets and the read-only asset_manifest MCP tool.

meta({
  name: 'Parametric mounting plate',
  description: 'A two-hole mounting plate with named size presets.',
  authors: ['kernelCAD example'],
  tags: ['plate', 'mounting', 'parametric'],
});

const knobs = params({
  width: { default: 80, min: 40, max: 140, unit: 'mm', label: 'Plate width' },
  depth: { default: 40, min: 20, max: 80, unit: 'mm', label: 'Plate depth' },
  thickness: { default: 6, min: 3, max: 12, unit: 'mm', label: 'Plate thickness' },
  holeDiameter: { default: 6, min: 3, max: 12, unit: 'mm', label: 'Mounting hole' },
  includeCenterMark: { default: false, description: 'Add a shallow locating mark' },
});

presets({
  Compact: { width: 60, depth: 30, thickness: 5, holeDiameter: 5, includeCenterMark: false },
  Standard: { width: 80, depth: 40, thickness: 6, holeDiameter: 6, includeCenterMark: false },
  Wide: { width: 120, depth: 50, thickness: 8, holeDiameter: 8, includeCenterMark: true },
});

let plate = box(knobs.width, knobs.depth, knobs.thickness, true)
  .hole('top', {
    u: knobs.width.divide(4).negate(),
    v: 0,
    diameter: knobs.holeDiameter,
    depth: 'through',
    name: 'leftMount',
  })
  .hole('top', {
    u: knobs.width.divide(4),
    v: 0,
    diameter: knobs.holeDiameter,
    depth: 'through',
    name: 'rightMount',
  });

if (knobs.includeCenterMark.value) {
  plate = plate.hole('top', { u: 0, v: 0, diameter: 2, depth: 0.8, name: 'centerMark' });
}

return plate;
