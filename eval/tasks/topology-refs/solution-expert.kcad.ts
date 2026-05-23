// Reference build for the topology-refs eval task. The box declares a
// user-applied face label `lid -> top`; a bottom-face pilot hole stamps
// lineage snapshots on every result face; the fillet on the bottom face
// preserves the top face's lineage; the final hole uses the label-form
// ref `@kc[base/face/lid]` to drive the face selector — end-to-end
// exercise of the F-surface @kc[...] round-trip property over a
// user-applied label (the case `list_faces` actually emits).

return box(20, 20, 5, false, { faceLabels: { lid: 'top' } })
  .hole('bottom', { u: 0, v: 0, diameter: 3, depth: 2, name: 'pilotHole' })
  .fillet(0.4, { face: 'bottom' })
  .hole('@kc[base/face/lid]', { u: 0, v: 0, diameter: 4, depth: 'through', name: 'lidBolt' });
