// Sharp-edged machined block with a filleted top edge set, a through bore
// and a raised boss. Used to compare GLB shading normals across hard B-rep
// edges (must stay sharp) and smooth faces (bore, boss, fillets).
const body = box(60, 40, 20)
  .fillet(4)
  .hole('top', { u: -15, v: 0, diameter: 12, depth: 'through' });
const boss = cylinder(10, 9).translate(45, 20, 20);

return body.union(boss).material({
  name: 'anodized aluminium',
  baseColor: '#8a96a8',
  metalness: 0.2,
  roughness: 0.45,
});
