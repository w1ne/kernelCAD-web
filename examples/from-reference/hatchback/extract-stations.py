#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Measure the station tables in hatchback.kcad.ts from the source mesh.

Source (not vendored): OSRF gazebo_models `hatchback/meshes/hatchback.obj`,
CC-BY 3.0, https://github.com/osrf/gazebo_models (see PROVENANCE.md).

    git clone --depth 1 https://github.com/osrf/gazebo_models /tmp/gazebo_models
    python3 -I extract-stations.py /tmp/gazebo_models/hatchback/meshes/hatchback.obj

Prints the raw measured LOWER / GREENHOUSE rows. The script tables were then
rounded and lightly hand-faired where the source mesh is coarse (see
PROVENANCE.md, "Hand edits"). Needs numpy only.

Frames: the OBJ is in inches, X lateral, Y along the car (nose at -Y), Z up.
Output is mm with s = distance from the front bumper, w = half-width |y|,
z = height above the ground (tyre bottom).
"""
import sys

import numpy as np

LOWER_S = [40, 150, 350, 600, 800, 1000, 1300, 1900, 2600, 3150, 3450, 3650, 3780, 3880, 3960]
GREENHOUSE_S = [860, 960, 1150, 1450, 1900, 2500, 3050, 3350, 3550, 3700, 3790]
# Source wheel-arch cut-outs (s ranges): the flank there is restored to the
# clean body side, since the port cuts its own wheel wells.
ARCHES = [(470, 1140), (2990, 3650)]


def belt_z(s):
    """Beltline (window sill) height: rises 40 mm from the A- to the D-pillar."""
    return 1060 + 40 * min(max((s - 750) / (3700 - 750), 0), 1)


def load(path):
    verts, faces, groups, group = [], [], [], None
    for line in open(path):
        tok = line.split()
        if not tok:
            continue
        if tok[0] == 'v':
            verts.append([float(t) for t in tok[1:4]])
        elif tok[0] == 'g':
            group = ' '.join(tok[1:])
        elif tok[0] == 'f':
            faces.append([int(t.split('/')[0]) - 1 for t in tok[1:]])
            groups.append(group)
    v = np.array(verts) * 25.4
    pts = np.stack([v[:, 1] - v[:, 1].min(), v[:, 0], v[:, 2] - v[:, 2].min()], 1)
    tris = []
    for f, g in zip(faces, groups):
        if g != 'Hatchback':  # body shell only; wheels are separate groups
            continue
        for k in range(1, len(f) - 1):
            tri = (f[0], f[k], f[k + 1])
            if max(abs(pts[i, 1]) for i in tri) < 945:  # drop the door-mirror shells
                tris.append(tri)
    return pts[np.array(tris)]


def hull_at(tris, s):
    """Convex hull (w, z) of the mesh section at s, mirrored to be symmetric."""
    pts = []
    for tri in tris:
        d = tri[:, 0] - s
        for a, b in ((0, 1), (1, 2), (2, 0)):
            if (d[a] < 0) != (d[b] < 0):
                t = d[a] / (d[a] - d[b])
                pts.append(tri[a, 1:] + t * (tri[b, 1:] - tri[a, 1:]))
    p = np.array(pts)
    p = sorted(set(map(tuple, np.round(np.vstack([p, p * [-1, 1]]), 3))))

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower, upper = [], []
    for q in p:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], q) <= 0:
            lower.pop()
        lower.append(q)
    for q in reversed(p):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], q) <= 0:
            upper.pop()
        upper.append(q)
    return np.array(lower[:-1] + upper[:-1])


def half_width(h, z):
    best = 0.0
    for i in range(len(h)):
        a, b = h[i], h[(i + 1) % len(h)]
        if (a[1] - z) * (b[1] - z) <= 0 and a[1] != b[1]:
            t = (z - a[1]) / (b[1] - a[1])
            best = max(best, a[0] + t * (b[0] - a[0]))
    return best


def smooth(a, k):
    mask = ~np.isnan(a)
    ker = np.ones(k)
    pad = k // 2
    num = np.convolve(np.pad(np.where(mask, a, 0), pad, mode='edge'), ker, 'valid')
    den = np.convolve(np.pad(mask.astype(float), pad, mode='edge'), ker, 'valid')
    out = a.copy()
    out[mask] = (num / np.maximum(den, 1e-9))[mask]
    return out


def main(path):
    tris = load(path)
    fine = np.arange(10, 3995, 10.0)
    rec = []
    for s in fine:
        h = hull_at(tris, s)
        z_sill, z_top, w_max = h[:, 1].min(), h[:, 1].max(), h[:, 0].max()
        z_at_wmax = np.mean([q[1] for q in h if q[0] > w_max - 10])
        if any(a < s < b for a, b in ARCHES):
            w_max, z_at_wmax = 940, 560
        cabin = z_top > belt_z(s) + 40
        z_shoulder = belt_z(s) if cabin else z_top - 70
        rec.append([
            s, z_sill, z_top, w_max, z_at_wmax, z_shoulder, half_width(h, z_shoulder - 1),
            half_width(h, belt_z(s) + 2) if cabin else np.nan,
            half_width(h, belt_z(s) + 0.55 * (z_top - belt_z(s))) if cabin else np.nan,
            half_width(h, z_top - 25) if cabin else np.nan,
        ])
    r = np.array(rec)
    for col, k in zip(range(1, 10), [9, 5, 9, 15, 9, 9, 9, 9, 9]):
        r[:, col] = smooth(r[:, col], k)

    def row(s):
        out = r[np.argmin(abs(r[:, 0] - s))].copy()
        out[0] = s
        return out

    print('// Lower body: [s, zSill, zMaxWidth, wMax, zShoulder, wShoulder, zTop]')
    for s in LOWER_S:
        x = row(s)
        z_top = x[5] + 70 if x[2] <= belt_z(s) + 40 else x[5] + 25
        print('  [' + ', '.join(f'{v:.0f}' for v in [s, x[1], x[4], x[3], x[5], x[6], min(z_top, x[2])]) + '],')
    print('// Greenhouse: [s, zBelt, wBelt, wMidGlass, wRoofRail, zRoof]')
    for s in GREENHOUSE_S:
        x = row(s)
        print('  [' + ', '.join(f'{v:.0f}' for v in [s, x[5], x[7], x[8], x[9], x[2]]) + '],')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
