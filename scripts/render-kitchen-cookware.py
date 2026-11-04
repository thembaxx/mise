"""Render review-only close/open frames for the original Blender cookware pack.

Usage:
  blender --background --factory-startup --python-exit-code 1 \
    --python scripts/render-kitchen-cookware.py -- \
    --input /tmp/kitchen/mise-premium-cookware-candidate.blend \
    --output-dir /tmp/kitchen

Images are for human assessment, not runtime assets or photorealism claims.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def add_area(name, xyz, power, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = power
    data.shape = "DISK"
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = xyz
    return obj


def set_camera(xyz, look_at):
    cam_data = bpy.data.cameras.new("Review camera")
    camera = bpy.data.objects.new("Review camera", cam_data)
    bpy.context.collection.objects.link(camera)
    camera.location = xyz
    direction = Vector(look_at) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 6.45
    bpy.context.scene.camera = camera


def create_stage():
    world = bpy.context.scene.world or bpy.data.worlds.new("Studio grey")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.22, .24, .22, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .5

    floor = bpy.data.materials.new("Unapproved review floor")
    floor.diffuse_color = (.58, .56, .52, 1)
    floor.use_nodes = True
    surface = floor.node_tree.nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = floor.diffuse_color
    surface.inputs["Roughness"].default_value = .86
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.16))
    plane = bpy.context.object
    plane.name = "Review background floor ONLY"
    plane.data.materials.append(floor)

    add_area("Key softbox", (1.5, -3.5, 5.2), 1000, 4.8)
    add_area("Side softbox", (3.8, 1.8, 4.5), 650, 4.0)
    add_area("Rim softbox", (-3.7, 2.2, 4.0), 1100, 3.3)
    set_camera((4.1, -6.6, 3.2), (.85, 0, .32))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)
    blend = Path(args.input).resolve()
    directory = Path(args.output_dir).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    if not blend.is_file():
        raise FileNotFoundError("Expected editable Blender source: " + str(blend))
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    create_stage()

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.render.image_settings.file_format = "PNG"
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 768
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False

    # The original animated lid is covered at frame 1, lifted at frame 25.
    for frame, label in ((1, "covered"), (25, "lifted")):
        scene.frame_set(frame)
        scene.render.filepath = str(directory / ("review-cookware-" + label + ".png"))
        bpy.ops.render.render(write_still=True)
        if not Path(scene.render.filepath).is_file():
            raise RuntimeError("Blender did not output review frame: " + label)
        print("Rendered unapproved cookware image", scene.render.filepath)


if __name__ == "__main__":
    main()
