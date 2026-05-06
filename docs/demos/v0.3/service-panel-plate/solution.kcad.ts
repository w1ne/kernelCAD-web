// Service-panel mounting plate — v0.3 hero artifact.
// Slice 3 makes the model parametric: dimensions, fastener diameters, and the
// optional cable port survive capture as symbolic params and can be edited
// post-build with params_update/session.params.update.

const plateW = param('plateW', 120, { min: 80, max: 180, description: 'overall plate width' });
const plateD = param('plateD', 80, { min: 50, max: 120, description: 'overall plate depth' });
const plateT = param('plateT', 10, { min: 4, max: 18, description: 'plate thickness' });
const cornerBoltDia = param('cornerBoltDia', 5, { min: 3, max: 8 });
const panelMountDia = param('panelMountDia', 6, { min: 4, max: 10 });
const panelCounterboreDia = param('panelCounterboreDia', 11, { min: 8, max: 16 });
const panelCounterboreDepth = param('panelCounterboreDepth', 4, { min: 1, max: 8 });
const groundStudDia = param('groundStudDia', 4, { min: 2, max: 6 });
const groundCountersinkDia = param('groundCountersinkDia', 8, { min: 5, max: 12 });
const addCablePort = param('addCablePort', true, { description: 'include the optional cable pass-through' });

return box(plateW, plateD, plateT)
  .holes('top', {
    positions: [
      { u: -50, v: -30 }, { u:  50, v: -30 },
      { u: -50, v:  30 }, { u:  50, v:  30 },
    ],
    diameter: cornerBoltDia, depth: 'through',
    name: 'cornerBolts',
  })
  .hole('top', {
    u: -20, v: 0, diameter: panelMountDia, depth: 'through',
    counterbore: { diameter: panelCounterboreDia, depth: panelCounterboreDepth },
    name: 'panelMountFront',
  })
  .hole('top', {
    u: 20, v: 0, diameter: panelMountDia, depth: 'through',
    counterbore: { diameter: panelCounterboreDia, depth: panelCounterboreDepth },
    name: 'panelMountBack',
  })
  .hole('top', {
    u: 40, v: 20, diameter: groundStudDia, depth: 'through',
    countersink: { diameter: groundCountersinkDia },
    name: 'groundStud',
  })
  .cutout(
    path()
      .moveTo(-8, -6)
      .lineTo( 8, -6)
      .threePointsArc(-8, -6, 0, 6)
      .close(),
    { face: 'top', depth: 'through', name: 'cablePort', enabled: addCablePort },
  );
