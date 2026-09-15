#!/usr/bin/env python3
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
#
# Validates a usd-isaac stage with the real `pxr` USD/Isaac schemas, not a
# regex over the .usda text. Checks:
#   - Usd.Stage.Open succeeds
#   - UsdPhysics.ArticulationRootAPI is applied somewhere on the stage
#   - every rigid body prim has UsdPhysics.MassAPI with mass > 0
#   - every UsdPhysics joint has valid body0/body1 targets and a valid axis
#     token (for joint types that have an axis, e.g. RevoluteJoint)
#   - mesh prims (referenced or authored) resolve to real geometry
#
# Usage: python usd_physics_check.py <path-to.usda>
# Exit code 0 on pass, 1 on any failure. Prints one line per check.

import sys


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: usd_physics_check.py <stage.usda>", file=sys.stderr)
        return 1
    stage_path = sys.argv[1]

    from pxr import Usd, UsdGeom, UsdPhysics

    stage = Usd.Stage.Open(stage_path)
    if stage is None:
        print(f"FAIL: Usd.Stage.Open could not open {stage_path}")
        return 1
    print(f"OK: opened stage {stage_path}")

    failures = []

    # --- ArticulationRootAPI applied somewhere ---
    has_articulation_root = False
    for prim in stage.Traverse():
        if UsdPhysics.ArticulationRootAPI(prim):
            has_articulation_root = True
            print(f"OK: ArticulationRootAPI applied on {prim.GetPath()}")
            break
    if not has_articulation_root:
        failures.append("no prim has UsdPhysics.ArticulationRootAPI applied")

    # --- every rigid body has MassAPI with positive mass ---
    rigid_body_count = 0
    for prim in stage.Traverse():
        rb = UsdPhysics.RigidBodyAPI(prim)
        if not rb:
            continue
        rigid_body_count += 1
        mass_api = UsdPhysics.MassAPI(prim)
        if not mass_api:
            failures.append(f"{prim.GetPath()} is a rigid body but has no MassAPI applied")
            continue
        mass_attr = mass_api.GetMassAttr()
        mass = mass_attr.Get() if mass_attr else None
        if mass is None or mass <= 0:
            failures.append(f"{prim.GetPath()} MassAPI mass is not positive: {mass!r}")
        else:
            print(f"OK: {prim.GetPath()} mass = {mass}")
    if rigid_body_count == 0:
        failures.append("stage has no PhysicsRigidBodyAPI prims to validate")

    # --- joints: valid body0/body1 targets, valid axis token ---
    body_paths = {
        prim.GetPath()
        for prim in stage.Traverse()
        if UsdPhysics.RigidBodyAPI(prim)
    }
    joint_count = 0
    valid_axes = {"X", "Y", "Z"}
    for prim in stage.Traverse():
        joint = UsdPhysics.Joint(prim)
        if not joint:
            continue
        joint_count += 1
        for rel_name, get_targets in (
            ("body0", joint.GetBody0Rel().GetTargets),
            ("body1", joint.GetBody1Rel().GetTargets),
        ):
            targets = get_targets()
            if not targets:
                failures.append(f"joint {prim.GetPath()} has no {rel_name} target")
                continue
            for t in targets:
                target_prim = stage.GetPrimAtPath(t)
                if not target_prim.IsValid():
                    failures.append(f"joint {prim.GetPath()} {rel_name} target {t} does not resolve")
                elif t not in body_paths:
                    failures.append(
                        f"joint {prim.GetPath()} {rel_name} target {t} is not a rigid body"
                    )

        # Axis applies to revolute/prismatic joints; check when present.
        revolute = UsdPhysics.RevoluteJoint(prim)
        prismatic = UsdPhysics.PrismaticJoint(prim)
        axis_joint = revolute or prismatic
        if axis_joint:
            axis_attr = axis_joint.GetAxisAttr()
            axis = axis_attr.Get() if axis_attr else None
            if axis not in valid_axes:
                failures.append(f"joint {prim.GetPath()} has invalid axis token: {axis!r}")
            else:
                print(f"OK: joint {prim.GetPath()} axis = {axis}")
    if joint_count == 0:
        failures.append("stage has no UsdPhysics joints to validate")

    # --- mesh prims resolve to real geometry ---
    mesh_count = 0
    for prim in stage.Traverse():
        mesh = UsdGeom.Mesh(prim)
        if not mesh:
            continue
        mesh_count += 1
        points_attr = mesh.GetPointsAttr()
        points = points_attr.Get() if points_attr else None
        face_counts_attr = mesh.GetFaceVertexCountsAttr()
        face_counts = face_counts_attr.Get() if face_counts_attr else None
        if not points or len(points) == 0:
            failures.append(f"mesh {prim.GetPath()} resolved with no points")
        elif not face_counts or len(face_counts) == 0:
            failures.append(f"mesh {prim.GetPath()} resolved with no faces")
        else:
            print(f"OK: mesh {prim.GetPath()} has {len(points)} points, {len(face_counts)} faces")
    if mesh_count == 0:
        failures.append("stage has no resolvable Mesh prims")

    if failures:
        for f in failures:
            print(f"FAIL: {f}")
        return 1

    print("PASS: all usd-isaac physics checks succeeded")
    return 0


if __name__ == "__main__":
    sys.exit(main())
