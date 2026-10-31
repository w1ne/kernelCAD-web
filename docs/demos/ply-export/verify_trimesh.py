# Independent read-back of mount.ply with trimesh (pip install trimesh numpy).
# Usage: python -I verify_trimesh.py mount.ply > trimesh-check.json
import json, sys
import numpy as np
import trimesh

mesh = trimesh.load(sys.argv[1], process=False)
colours = np.unique(np.asarray(mesh.visual.vertex_colors)[:, :3], axis=0).tolist()
normals = np.asarray(mesh.vertex_normals)
print(json.dumps({
    "reader": f"trimesh {trimesh.__version__}",
    "vertices": int(len(mesh.vertices)),
    "faces": int(len(mesh.faces)),
    "boundsMm": np.round(mesh.bounds, 6).tolist(),
    "vertexColours": colours,
    "unitNormals": bool(np.allclose(np.linalg.norm(normals, axis=1), 1, atol=1e-4)),
}, indent=2))
