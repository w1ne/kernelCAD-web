#!/usr/bin/env python3
"""Offline Blender render of the STL exported from demo.kcad.ts."""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def arg_paths():
    args = sys.argv[sys.argv.index("--") + 1:]
    if len(args) != 3:
        raise SystemExit("usage: render_demo.py -- <model.stl> <raw.mp4> <manifest.json>")
    return [Path(value).resolve() for value in args]


stl_path, output_path, manifest_path = arg_paths()
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.wm.stl_import(filepath=str(stl_path))
model = bpy.context.view_layer.objects.active
if model is None or model.type != "MESH":
    raise RuntimeError("STL import did not produce a mesh object")

coords = [Vector(corner) for corner in model.bound_box]
minimum = Vector(tuple(min(point[i] for point in coords) for i in range(3)))
maximum = Vector(tuple(max(point[i] for point in coords) for i in range(3)))
center = (minimum + maximum) * 0.5
size = maximum - minimum
model.location = -center
model.name = "Boolean seam fillet result"

material = bpy.data.materials.new("KernelCAD steel blue")
material.diffuse_color = (0.18, 0.42, 0.72, 1.0)
material.use_nodes = True
principled = material.node_tree.nodes.get("Principled BSDF")
principled.inputs["Base Color"].default_value = material.diffuse_color
principled.inputs["Metallic"].default_value = 0.65
principled.inputs["Roughness"].default_value = 0.28
model.data.materials.clear()
model.data.materials.append(material)

world = bpy.data.worlds.new("CAD review background")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.025, 0.038, 0.062, 1.0)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.65
scene = bpy.context.scene
scene.world = world

def area_light(name, location, power, size):
    data = bpy.data.lights.new(name, type="AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 0)) - obj.location).to_track_quat("-Z", "Y").to_euler()


area_light("Key", (45, -35, 55), 5000, 42)
area_light("Fill", (-40, -20, 24), 2800, 36)
area_light("Rim", (15, 45, 38), 4200, 30)

orbit = bpy.data.objects.new("Turntable", None)
scene.collection.objects.link(orbit)
camera_data = bpy.data.cameras.new("Camera")
camera = bpy.data.objects.new("Camera", camera_data)
scene.collection.objects.link(camera)
camera.parent = orbit
camera.location = (0, -max(size) * 2.7, max(size) * 1.65)
camera_data.lens = 52
track = camera.constraints.new(type="TRACK_TO")
track.target = orbit
track.track_axis = "TRACK_NEGATIVE_Z"
track.up_axis = "UP_Y"
scene.camera = camera

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 12
scene.cycles.use_denoising = False
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.fps = 15
scene.render.image_settings.color_mode = "RGB"
scene.render.filepath = str(output_path)
scene.render.image_settings.file_format = "FFMPEG"
scene.render.ffmpeg.format = "MPEG4"
scene.render.ffmpeg.codec = "H264"
scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
scene.render.ffmpeg.ffmpeg_preset = "GOOD"
scene.view_settings.view_transform = "Standard"
scene.view_settings.look = "Medium High Contrast"
scene.display.shading.light = "STUDIO"
scene.render.film_transparent = False
scene.frame_start = 1
scene.frame_end = 60
scene.frame_set(1)

orbit.rotation_euler[2] = 0
orbit.keyframe_insert(data_path="rotation_euler", frame=1)
orbit.rotation_euler[2] = math.tau
orbit.keyframe_insert(data_path="rotation_euler", frame=61)
for curve in orbit.animation_data.action.fcurves:
    for key in curve.keyframe_points:
        key.interpolation = "LINEAR"

manifest = {
    "renderer": f"Blender {bpy.app.version_string} / Cycles CPU",
    "source_stl": stl_path.name,
    "triangles": len(model.data.polygons),
    "size_mm": [round(size.x, 6), round(size.y, 6), round(size.z, 6)],
    "frame_size_px": [720, 720],
    "fps": 15,
    "frames": 60,
    "duration_seconds": 4,
    "camera_elevation_deg": round(math.degrees(math.atan2(camera.location.z, -camera.location.y)), 3),
}
manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
output_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(animation=True)
print(json.dumps(manifest, indent=2))
