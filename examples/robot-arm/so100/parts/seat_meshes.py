#!/usr/bin/env python3
# SPDX-License-Identifier: Apache-2.0
"""Seat the SO-ARM100 printed links on their STS3215 servos.

The vendor simulation meshes in `sim/` are simplified exports. Each servo
mesh sits a fraction of a millimetre into the printed link that holds it,
and into the link it drives, so the solids share tens of mm³ that the
real printed pockets do not have. This script removes exactly that
material with exact manifold booleans and writes the result to
`sim-seated/` (same frames, same metres, binary STL):

  * pocket:    link -= the servo bolted into it (the servo's own pocket);
  * clearance: link -= the servo that drives it, swept about the joint
               axis over the joint's full URDF travel, so the link clears
               the servo housing and output spline at every angle.

A pocket is cut by the neighbouring servo's own surface. A clearance is a
groove of revolution about the joint axis: an annular sector just holding
each piece of shared material, like the relief a printed link has.

The same is done link on link where the arm touches itself: the shoulder
clears the base bearing over the pan travel, and the upper arm clears the
base in the folded (all joints zero) rest pose. Servos are never edited. Lower_Arm.stl is two bodies glued face to face
with non-manifold seams and cannot be carved exactly; it ships as-is (its
residual contact with its servo is under the 20 mm³ noise cap).

Usage:  python3 seat_meshes.py      (needs: pip install trimesh manifold3d)
"""
import os
import numpy as np
import trimesh
import manifold3d as m3
from trimesh.transformations import euler_matrix, rotation_matrix

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'sim')
DST = os.path.join(HERE, 'sim-seated')
STEP_DEG = 2.0

# so100.urdf joints: (child mesh, parent mesh, servo in parent frame,
# origin xyz [m], rpy [rad], child axis, limits [rad]).
JOINTS = [
    ('Rotation_Pitch', 'Base', 'Base_Motor', [0, -0.0452, 0.0165], [1.57079, 0, 0], [0, 1, 0], (-2.0, 2.0)),
    ('Upper_Arm', 'Rotation_Pitch', 'Rotation_Pitch_Motor', [0, 0.1025, 0.0306], [-1.8, 0, 0], [1, 0, 0], (0.0, 3.5)),
    ('Lower_Arm', 'Upper_Arm', 'Upper_Arm_Motor', [0, 0.11257, 0.028], [1.57079, 0, 0], [1, 0, 0], (-3.14158, 0.0)),
    ('Wrist_Pitch_Roll', 'Lower_Arm', 'Lower_Arm_Motor', [0, 0.0052, 0.1349], [-1, 0, 0], [1, 0, 0], (-2.5, 1.2)),
    ('Fixed_Jaw', 'Wrist_Pitch_Roll', 'Wrist_Pitch_Roll_Motor', [0, -0.0601, 0], [0, 1.57079, 0], [0, 1, 0], (-3.14158, 3.14158)),
    ('Moving_Jaw', 'Fixed_Jaw', 'Fixed_Jaw_Motor', [-0.0202, -0.0244, 0], [0, 3.14158, 0], [0, 0, 1], (-0.2, 2.0)),
]
OWN_SERVO = {
    'Base': 'Base_Motor', 'Rotation_Pitch': 'Rotation_Pitch_Motor', 'Upper_Arm': 'Upper_Arm_Motor',
    'Lower_Arm': 'Lower_Arm_Motor', 'Wrist_Pitch_Roll': 'Wrist_Pitch_Roll_Motor', 'Fixed_Jaw': 'Fixed_Jaw_Motor',
}
SKIP = {'Lower_Arm'}


def load(name):
    t = trimesh.load(os.path.join(SRC, name + '.stl'))
    t.merge_vertices()
    return t


def manifold(t, transform=None):
    v = np.asarray(t.vertices, np.float64)
    if transform is not None:
        v = trimesh.transform_points(v, transform)
    mesh = m3.Mesh(vert_properties=v.astype(np.float32), tri_verts=np.asarray(t.faces, np.uint32))
    mesh.merge()
    m = m3.Manifold(mesh)
    if m.status() != m3.Error.NoError:
        raise ValueError(f'not manifold: {m.status()}')
    return m


def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(np.asarray(mesh.vert_properties)[:, :3], np.asarray(mesh.tri_verts), process=False)


def sector_cutter(piece, axis, margin=5e-5):
    """Annular sector about `axis` (through the link-frame origin, which is
    the joint origin) that just contains `piece`. Revolute clearance is a
    groove of revolution, the shape a real printed relief has."""
    axis = np.asarray(axis, float)
    axis = axis / np.linalg.norm(axis)
    # Frame with Z on the joint axis.
    helper = np.array([1.0, 0, 0]) if abs(axis[0]) < 0.9 else np.array([0, 1.0, 0])
    ex = np.cross(helper, axis)
    ex /= np.linalg.norm(ex)
    ey = np.cross(axis, ex)
    v = np.asarray(piece.to_mesh().vert_properties)[:, :3]
    x, y, z = v @ ex, v @ ey, v @ axis
    r = np.hypot(x, y)
    theta = np.degrees(np.arctan2(y, x))
    # Smallest arc holding every vertex angle.
    order = np.sort(theta)
    gaps = np.diff(np.concatenate([order, order[:1] + 360]))
    k = int(np.argmax(gaps))
    start = order[(k + 1) % len(order)]
    span = 360 - gaps[k]
    pad = np.degrees(margin / max(r.min(), 1e-4)) + 0.5
    rect = m3.CrossSection.square([r.max() - r.min() + 2 * margin, z.max() - z.min() + 2 * margin]) \
        .translate([max(r.min() - margin, 0), z.min() - margin])
    if span + 2 * pad >= 359:
        ring = m3.Manifold.revolve(rect, 192)
    else:
        ring = m3.Manifold.revolve(rect, max(8, int((span + 2 * pad) / 2)), span + 2 * pad)
        ring = ring.rotate([0, 0, start - pad])
    frame = np.eye(4)
    frame[:3, 0], frame[:3, 1], frame[:3, 2] = ex, ey, axis
    return ring.transform(frame[:3, :])


def main():
    os.makedirs(DST, exist_ok=True)
    tools = {}
    for name, servo in OWN_SERVO.items():
        tools.setdefault(name, []).append(('pocket', manifold(load(servo)), None))
    for child, _parent, servo, xyz, rpy, axis, (lo, hi) in JOINTS:
        joint = euler_matrix(*rpy, 'sxyz')
        joint[:3, 3] = xyz
        inv_joint = np.linalg.inv(joint)
        servo_mesh = load(servo)
        sweep = None
        for q in np.arange(lo, hi + 1e-9, np.radians(STEP_DEG)).tolist() + [hi]:
            copy = manifold(servo_mesh, rotation_matrix(-q, axis) @ inv_joint)
            sweep = copy if sweep is None else sweep + copy
        tools.setdefault(child, []).append(('clearance', sweep, axis))
    # Link on link. The shoulder turns on the base's pan bearing ring, and
    # at the lift lower limit (the folded rest pose, all joints zero) the
    # upper arm rests on the base. Both touch, neither may share volume.
    base = load('Base')
    pan_joint = euler_matrix(*JOINTS[0][4], 'sxyz')
    pan_joint[:3, 3] = JOINTS[0][3]
    lo, hi = JOINTS[0][6]
    ring = None
    for q in np.arange(lo, hi + 1e-9, np.radians(STEP_DEG)).tolist() + [hi]:
        copy = manifold(base, rotation_matrix(-q, JOINTS[0][5]) @ np.linalg.inv(pan_joint))
        ring = copy if ring is None else ring + copy
    tools['Rotation_Pitch'].append(('base bearing clearance', ring, JOINTS[0][5]))
    lift_joint = euler_matrix(*JOINTS[1][4], 'sxyz')
    lift_joint[:3, 3] = JOINTS[1][3]
    tools['Upper_Arm'].append(('folded rest on base', manifold(base, np.linalg.inv(pan_joint @ lift_joint)), None))
    for name in ['Base', 'Rotation_Pitch', 'Upper_Arm', 'Lower_Arm', 'Wrist_Pitch_Roll', 'Fixed_Jaw', 'Moving_Jaw']:
        if name in SKIP:
            print(f'{name}: kept as vendor mesh (non-manifold seams)')
            continue
        link = manifold(load(name))
        before = link.volume()
        for kind, tool, axis in tools.get(name, []):
            shared = link ^ tool
            if shared.volume() <= 1e-12:
                print(f'{name}: {kind} nothing to remove')
                continue
            if axis is None:
                # A fixed neighbour: its own facets are the pocket wall.
                cutter = tool
            else:
                # A swept servo is a union of ~100 copies; cutting by it
                # leaves thousands of slivers. Cut a clean groove of
                # revolution around each piece of shared material instead.
                cutter = m3.Manifold.batch_boolean(
                    [sector_cutter(p, axis) for p in shared.decompose() if p.volume() > 1e-12], m3.OpType.Add)
            cut = link - cutter
            print(f'{name}: {kind} shares {shared.volume() * 1e9:.1f} mm³, '
                  f'cut removes {(link.volume() - cut.volume()) * 1e9:.1f} mm³')
            link = cut
        # Fold the facets the booleans re-split back together (10 µm,
        # below the vendor tessellation's own chordal error).
        link = link.simplify(1e-5)
        out = to_trimesh(link)
        path = os.path.join(DST, name + '.stl')
        out.export(path)
        # The written file must reload as a closed manifold solid.
        manifold(trimesh.load(path, process=False))
        print(f'{name}: {before * 1e9:.0f} -> {link.volume() * 1e9:.0f} mm³, {len(out.faces)} triangles')


if __name__ == '__main__':
    main()
