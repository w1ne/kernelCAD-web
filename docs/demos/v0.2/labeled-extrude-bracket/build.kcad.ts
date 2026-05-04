return extrudeRect(60, 30, 12, { faceLabels: { rim: { parallelTo: 'XY', atZ: 12 } } })
  .fillet(3, { face: 'rim' });
