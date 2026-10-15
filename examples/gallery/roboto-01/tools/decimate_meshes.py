from pathlib import Path
import trimesh
src=Path('/tmp/RP1_description/meshes')
dst=Path('/Users/andrii/worktrees/kcw-rp1-gallery/examples/gallery/roboto-01/meshes')
for p in sorted(src.glob('*.STL')):
    mesh=trimesh.load_mesh(p, process=False)
    # Retain closed-source surface fidelity while reducing only facet density.
    target=min(len(mesh.faces), 2500)
    simplified=mesh.simplify_quadric_decimation(face_count=target)
    out=dst/p.name
    simplified.export(out, file_type='stl')
    print(p.name, len(mesh.faces), '=>',len(simplified.faces),out.stat().st_size)
