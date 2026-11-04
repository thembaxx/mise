"""Author an original, editable Blender cookware review pack for Mise.

Run with Blender (bpy is deliberately authoring-only):
  blender --background --factory-startup --python-exit-code 1 \
    --python scripts/author-kitchen-cookware.py -- --output-dir /tmp/mise-kitchen

Produces .blend, embedded .glb and a SHA-256 provenance manifest.
Nothing writes to public/models/ or changes the production kitchen automatically.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy

STEM = "mise-premium-cookware-candidate"
RINGS = 128


def pbr(name, rgb, *, metallic=0.0, roughness=0.5, transmission=0.0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*rgb, 1.0)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    transmission_socket = shader.inputs.get("Transmission Weight") or shader.inputs.get("Transmission")
    if transmission_socket is not None:
        transmission_socket.default_value = transmission
    ior_socket = shader.inputs.get("IOR")
    if ior_socket is not None:
        ior_socket.default_value = 1.47 if transmission else 1.5
    return material


def parent_object(obj, parent):
    obj.parent = parent
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def empty(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def lathe(name, profile, material, root, *, segments=RINGS):
    vertices = []
    for radius, height in profile:
        for j in range(segments):
            angle = j * math.tau / segments
            vertices.append((radius * math.cos(angle), radius * math.sin(angle), height))
    faces = []
    for i in range(len(profile) - 1):
        for j in range(segments):
            a = i * segments + j
            b = i * segments + (j + 1) % segments
            c = (i + 1) * segments + (j + 1) % segments
            d = (i + 1) * segments + j
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(name + " geometry")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return parent_object(obj, root)


def torus(name, root, radius, tube, z, material, *, x=0.0, y=0.0):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius,
        minor_radius=tube,
        major_segments=144,
        minor_segments=16,
        location=(x, y, z),
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return parent_object(obj, root)


def cylinder(name, root, location, radius, height, material, *, verts=48, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=height, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = rotation
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Bevelled production edge", "BEVEL")
    bevel.width = 0.012 if radius > .06 else .006
    bevel.segments = 3
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return parent_object(obj, root)


def create():
    root = empty("Mise_Kitchen_Cookware")
    pan = empty("Skillet_Group", root)
    lid = empty("Lid_Animated_Transform", root)

    steel = pbr("Brushed stainless steel", (.55, .61, .6), metallic=.92, roughness=.23)
    edge = pbr("Polished stainless edge", (.82, .85, .81), metallic=.95, roughness=.17)
    nonstick = pbr("Soft dark ceramic nonstick", (.095, .113, .109), metallic=.18, roughness=.46)
    grip = pbr("Heat safe graphite grip", (.075, .086, .082), metallic=.1, roughness=.6)
    glass = pbr("Borosilicate glass", (.91, .97, .94), metallic=0, roughness=.07, transmission=.87)

    # Two separate manufacturing surfaces: a continuous curved exterior and
    # the concave cooking bowl. This is not a solid pancake-like cylinder.
    outer = lathe("Skillet_outer_curved_shell", [
        (.005, .06), (.50, .06), (.71, .065), (.80, .081),
        (.89, .122), (.976, .267), (1.042, .42), (1.055, .439),
    ], steel, pan)
    inner = lathe("Skillet_inner_ceramic_bowl", [
        (.005, .273), (.50, .273), (.71, .28), (.83, .31),
        (.92, .361), (1.014, .431),
    ], nonstick, pan)

    torus("Skillet_polished_rolled_rim", pan, 1.036, .026, .441, edge)
    torus("Skillet_base_pressure_ring", pan, .71, .014, .069, steel)
    for i, radius in enumerate((.88, .93)):
        torus("Skillet_brushed_outer_detail_%02d" % i, pan, radius, .005, .185 + i * .045, steel)
    for offset in (-.14, .14):
        cylinder(
            "Skillet_rivet_%s" % ("L" if offset < 0 else "R"),
            pan, (.993, offset, .345), .043, .025, edge,
            verts=24, rotation=(0, math.pi / 2, 0)
        )
    cylinder("Skillet_handle_ferrule", pan, (1.27, 0, .315), .124, .42, steel, rotation=(0, math.pi / 2, 0))
    cylinder("Skillet_handle_graphite", pan, (1.92, 0, .315), .134, 1.00, grip, rotation=(0, math.pi / 2, 0))
    cylinder("Skillet_handle_endcap", pan, (2.44, 0, .315), .119, .045, edge, rotation=(0, math.pi / 2, 0))

    # Lid animation is a translation/rotation of its dedicated root node,
    # so the frontend can map it onto the same accessible cover control.
    lathe("Lid_curved_glass_shell", [
        (.005, .184), (.13, .181), (.28, .17), (.51, .14),
        (.72, .087), (.88, .033), (.98, .015),
    ], glass, lid)
    torus("Lid_polished_rolled_edge", lid, .978, .041, .014, edge)
    cylinder("Lid_graphite_knob_foot", lid, (0, 0, .21), .20, .092, grip, verts=64)
    cylinder("Lid_polished_knob_cap", lid, (0, 0, .30), .14, .085, edge, verts=64)
    cylinder("Lid_knob_top_grip", lid, (0, 0, .355), .124, .035, grip, verts=64)
    for index in range(16):
        angle = index * 2.399963
        radius = .18 + (index % 5) * .13
        # Quiet condensation scale cues, without a 2D opacity overlay.
        cylinder(
            "Lid_condensation_%02d" % index, lid,
            (math.cos(angle) * radius, math.sin(angle) * radius,
             .052 + .12 * (1 - radius / .98)),
            .009 + (index % 3) * .004, .002, glass, verts=12
        )

    lid.location = (0, 0, .45)
    for frame, loc, tilt in [
        (1, (0, 0, .45), 0),
        (25, (1.6, 1.12, .62), -.25),
        (49, (0, 0, .45), 0),
    ]:
        lid.location = loc
        lid.rotation_euler = (0, tilt, 0)
        lid.keyframe_insert(data_path="location", frame=frame)
        lid.keyframe_insert(data_path="rotation_euler", frame=frame)
    action = lid.animation_data.action if lid.animation_data else None
    if action:
        action.name = "Lid_cover_lift_review"
    return root, len([obj for obj in bpy.data.objects if obj.type == "MESH"])


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args(argv)
    directory = Path(args.output_dir).expanduser().resolve()
    directory.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 49
    bpy.context.scene.render.fps = 24

    root, mesh_count = create()
    if not 12 <= mesh_count <= 80:
        raise RuntimeError("Unexpected number of exported cookware meshes: %s" % mesh_count)
    bpy.context.scene.frame_set(1)

    blend = directory / (STEM + ".blend")
    glb = directory / (STEM + ".glb")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend), check_existing=False)
    bpy.ops.export_scene.gltf(
        filepath=str(glb),
        export_format="GLB",
        export_animations=True,
        export_frame_range=True,
        export_force_sampling=True,
        export_materials="EXPORT",
        export_yup=True,
    )

    if not glb.is_file() or not glb.stat().st_size:
        raise RuntimeError("Missing Blender-authored GLB")
    manifest = {
        "project": "mise",
        "preset": "kitchen-cookware",
        "source": blend.name,
        "candidate": glb.name,
        "generator": "Blender bpy",
        "blender_version": bpy.app.version_string,
        "sha256": hashlib.sha256(glb.read_bytes()).hexdigest(),
        "model_units": "Blender metres; glTF exported with Y-up axis",
        "mesh_count": mesh_count,
        "review_status": "UNAPPROVED",
        "license": "Original generated work; no third-party geometry or textures",
        "notes": "Never replace live 3D models until Blender, GLB and browser appearance are reviewed.",
    }
    (directory / (STEM + ".json")).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
