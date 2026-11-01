# Cut-away still of an exported lattice STL: drop every triangle with any
# vertex beyond the cut plane, then z-buffer the rest (two-sided Lambert;
# faces seen from behind - the inside of the walls through the cut - are
# tinted). The viewer's --section capping fills a cut solid, which hides a
# lattice, so this still is rasterised directly from the export instead.
# Usage: python3 -I cutaway.py <in.stl> <out.png> [axis=y] [at=20] [size=768] [az=-35] [el=28]
import struct
import sys

import numpy as np
from PIL import Image

path, out = sys.argv[1], sys.argv[2]
axis = {"x": 0, "y": 1, "z": 2}[sys.argv[3] if len(sys.argv) > 3 else "y"]
at = float(sys.argv[4]) if len(sys.argv) > 4 else 20.0
size = int(sys.argv[5]) if len(sys.argv) > 5 else 768

data = open(path, "rb").read()
n = struct.unpack_from("<I", data, 80)[0]
rec = np.frombuffer(data, dtype=np.dtype([("n", "<f4", 3), ("v", "<f4", (3, 3)), ("a", "<u2")]), count=n, offset=84)
tri = rec["v"].astype(np.float64)
tri = tri[(tri[:, :, axis] <= at).all(axis=1)]

# Camera: azimuth from the kept side towards the cut face, elevated.
az = np.radians(float(sys.argv[6]) if len(sys.argv) > 6 else -35.0)
el = np.radians(float(sys.argv[7]) if len(sys.argv) > 7 else 28.0)
eye_dir = np.array([np.sin(az) * np.cos(el), np.cos(el) * np.cos(az), np.sin(el)])
right = np.cross([0, 0, 1], eye_dir)
right /= np.linalg.norm(right)
up = np.cross(eye_dir, right)
pts = tri.reshape(-1, 3)
c = (pts.max(0) + pts.min(0)) / 2
P = np.stack([(pts - c) @ right, (pts - c) @ up, (pts - c) @ eye_dir], axis=1).reshape(-1, 3, 3)
scale = 0.9 * size / max(np.ptp(P[:, :, 0]), np.ptp(P[:, :, 1]))
sx = P[:, :, 0] * scale + size / 2
sy = size / 2 - P[:, :, 1] * scale
depth = P[:, :, 2]
nrm = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
facing = nrm @ eye_dir
light = np.array([0.4, 0.3, 0.85]); light /= np.linalg.norm(light)
shade = 0.25 + 0.75 * np.abs(nrm @ light)

zbuf = np.full((size, size), -np.inf)
img = np.full((size, size, 3), 150.0)
front_col = np.array([205.0, 215.0, 232.0])
back_col = np.array([232.0, 160.0, 90.0])
for t in range(len(tri)):
    x0, x1 = int(max(0, np.floor(sx[t].min()))), int(min(size - 1, np.ceil(sx[t].max())))
    y0, y1 = int(max(0, np.floor(sy[t].min()))), int(min(size - 1, np.ceil(sy[t].max())))
    if x1 < x0 or y1 < y0:
        continue
    ax, ay, bx, by, cx, cy = sx[t, 0], sy[t, 0], sx[t, 1], sy[t, 1], sx[t, 2], sy[t, 2]
    den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
    if abs(den) < 1e-12:
        continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    w0 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / den
    w1 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / den
    w2 = 1 - w0 - w1
    m = (w0 >= 0) & (w1 >= 0) & (w2 >= 0)
    if not m.any():
        continue
    z = w0 * depth[t, 0] + w1 * depth[t, 1] + w2 * depth[t, 2]
    sub = zbuf[y0:y1 + 1, x0:x1 + 1]
    win = m & (z > sub)
    sub[win] = z[win]
    col = (front_col if facing[t] >= 0 else back_col) * shade[t]
    img[y0:y1 + 1, x0:x1 + 1][win] = col
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out)
print("wrote", out, len(tri), "triangles")
