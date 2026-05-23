// Reference build for the topology-refs eval task. A bottom-face pilot
// hole stamps lineage snapshots on every result face, the fillet on the
// bottom face preserves the top face's lineage, and the final hole uses
// the @kc[base/face/top] ref string to drive the face selector — end-to-
// end exercise of the F-surface @kc[...] round-trip property.

return box(20, 20, 5, false)
  .hole('bottom', { u: 0, v: 0, diameter: 3, depth: 2, name: 'pilotHole' })
  .fillet(0.4, { face: 'bottom' })
  .hole('@kc[base/face/top]', { u: 0, v: 0, diameter: 4, depth: 'through', name: 'lidBolt' });
