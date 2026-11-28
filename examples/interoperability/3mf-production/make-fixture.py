# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
"""Write standoff-plate.3mf with the 3MF Consortium lib3mf 2.5.0 writer.

The layout matches a Bambu Studio / OrcaSlicer project file: the root model
part holds one components object; its components reference mesh objects in a
separate /3D/Objects/standoff_plate.model part through the Production
extension (p:path). The hexagonal standoff mesh is instanced twice.

  60 x 40 x 3 mm plate, origin at (0, 0, 0)
  two hexagonal standoffs, circumradius 4 mm, 8 mm tall, on the plate top at
  (10, 20) and (50, 20); the second instance is turned 90 degrees about Z
  (an exact rotation; lib3mf writes transforms with 6 significant digits).
  lib3mf writes vertices with 6 decimals, so the hexagon apothem is stored as
  3.464101 (not 2*sqrt(3)); its area is 12 * 3.464101 mm^2.
  Volume: 7200 + 2 * 8 * 12 * 3.464101 = 7865.107392 mm^3.
  p:UUID values are random, so a rerun changes the bytes, not the geometry.

Run: python -I make-fixture.py <out.3mf>   (pip install lib3mf==2.5.0)
"""
import math
import sys

import lib3mf

wrapper = lib3mf.get_wrapper()
model = wrapper.CreateModel()
model.SetUnit(lib3mf.ModelUnit.MilliMeter)
objects_part = model.FindOrCreatePackagePart('/3D/Objects/standoff_plate.model')


def position(x, y, z):
    p = lib3mf.Position()
    p.Coordinates[0], p.Coordinates[1], p.Coordinates[2] = x, y, z
    return p


def triangle(a, b, c):
    t = lib3mf.Triangle()
    t.Indices[0], t.Indices[1], t.Indices[2] = a, b, c
    return t


def mesh(name, vertices, triangles):
    obj = model.AddMeshObject()
    obj.SetName(name)
    obj.SetGeometry([position(*v) for v in vertices], [triangle(*t) for t in triangles])
    obj.SetPackagePart(objects_part)
    assert obj.IsManifoldAndOriented(), name
    return obj


def prism(polygon, height):
    """Closed prism over a counter-clockwise polygon, outward-facing triangles."""
    n = len(polygon)
    vertices = [(x, y, 0.0) for x, y in polygon] + [(x, y, height) for x, y in polygon]
    triangles = []
    for i in range(1, n - 1):
        triangles.append((0, i + 1, i))
        triangles.append((n, n + i, n + i + 1))
    for i in range(n):
        j = (i + 1) % n
        triangles.append((i, j, n + j))
        triangles.append((i, n + j, n + i))
    return vertices, triangles


plate = mesh('plate', *prism([(0, 0), (60, 0), (60, 40), (0, 40)], 3.0))
hexagon = [(4 * math.cos(math.pi * k / 3), 4 * math.sin(math.pi * k / 3)) for k in range(6)]
standoff = mesh('hex_standoff', *prism(hexagon, 8.0))


def transform(angle_deg, tx, ty, tz):
    t = lib3mf.Transform()
    c, s = {0: (1.0, 0.0), 90: (0.0, 1.0)}[angle_deg]
    rows = [[c, s, 0.0], [-s, c, 0.0], [0.0, 0.0, 1.0], [tx, ty, tz]]
    for r in range(4):
        for col in range(3):
            t.Fields[r][col] = rows[r][col]
    return t


assembly = model.AddComponentsObject()
assembly.SetName('standoff_plate')
assembly.AddComponent(plate, transform(0, 0, 0, 0))
assembly.AddComponent(standoff, transform(0, 10, 20, 3))
assembly.AddComponent(standoff, transform(90, 50, 20, 3))
model.AddBuildItem(assembly, transform(0, 0, 0, 0))

model.QueryWriter('3mf').WriteToFile(sys.argv[1])
