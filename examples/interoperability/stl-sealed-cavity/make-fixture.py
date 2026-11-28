# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Writes sealed-float.stl with Blender (checked with 4.0.2):
#   blender --background --factory-startup --python examples/interoperability/stl-sealed-cavity/make-fixture.py
#
# A sealed float: a 32-sided prism, 30 mm across corners and 40 mm tall, around a
# closed void 24 mm across corners and 34 mm tall (3 mm walls, floor and lid).
# The void is a second mesh shell whose normals point into the void.
import os

import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)

bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=15, depth=40, location=(0, 0, 20))
outer = bpy.context.active_object
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=12, depth=34, location=(0, 0, 20))
void = bpy.context.active_object
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.flip_normals()
bpy.ops.object.mode_set(mode='OBJECT')

outer.select_set(True)
bpy.context.view_layer.objects.active = outer
bpy.ops.object.join()

target = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sealed-float.stl')
bpy.ops.export_mesh.stl(filepath=target, use_selection=True, ascii=False)
