---
title: Studio markup snapshots
summary: Mark up a model in Studio and send its camera, notes, picked topology and measurements with an agent prompt.
date: 2026-10-20
kind: guide
---

Studio markup lets you pin a short note to the model and save measurements from
the viewer. When you send a prompt to the Studio agent, it receives a validated,
versioned JSON snapshot of the camera, picked topology, notes and measurements.
The same JSON can be saved to a file and loaded later to restore the view and
overlays.

## Make and replay markup

Open **Markup** in the viewer toolbar. Enter a note, leave **Place note** on,
and click a visible point on the model. The note is anchored at the snapped
model point and the picked face or edge is highlighted. The Notes list lets you
edit or remove notes. To measure, choose **Measure** and click two points; a
completed distance is kept in the Markup panel. Clicking one circular edge
records its diameter. Remove individual measurements from the list, or choose
**Clear all markup**.

Sending a prompt captures the current camera and markup at that moment and
always attaches it to the prompt as a versioned JSON code block, including when
the only context is the camera and the selection, measurements and notes arrays
are empty. The camera records view state rather than markup; Studio includes it
so the agent can reproduce the view the user saw even when there are no
annotations or picks. Changes made after sending do not alter that run's saved
context. **Save JSON** downloads the current snapshot. **Load JSON** validates
the file, restores its camera pose, and redisplays saved notes, measurements and
topology highlights.

This is local Studio viewer context. It does not change the CAD script or model.
Markup stays with the open project and is cleared when you switch projects.
Point coordinates and measurement values use model-space millimetres. Face and
edge identifiers refer to the current rendered shape and may change after a
model rebuild.

## Format, version 1

The root object has `schemaVersion`, `camera`, `selection`, `measurements` and
`notes`. Version 1 supports the perspective camera used by Studio. `fov` is in
degrees; `zoom` is the Three.js camera zoom. Camera position, target and up are
three-number model-space vectors.

```json
{
  "schemaVersion": 1,
  "camera": {
    "position": [40, 40, 40],
    "target": [0, 0, 0],
    "up": [0, 0, 1],
    "projection": "perspective",
    "fov": 40,
    "zoom": 1
  },
  "selection": {
    "topologyRefs": [
      { "shapeIndex": 0, "kind": "face", "id": 4, "featureId": "base_plate" }
    ]
  },
  "measurements": [
    {
      "id": "measure-1",
      "type": "distance",
      "endpoints": [[0, 0, 0], [3, 4, 0]],
      "refs": [{ "shapeIndex": 0, "kind": "edge", "id": 2 }],
      "value": 5,
      "units": "mm"
    }
  ],
  "notes": [
    {
      "id": "note-1",
      "text": "Keep this face flat",
      "anchor": [12, 8, 6],
      "refs": [{ "shapeIndex": 0, "kind": "face", "id": 4 }]
    }
  ]
}
```

`topologyRefs` is a generic list of face or edge references. A reference records
the geometry's `shapeIndex`, its `kind`, the local face or edge `id`, and the
optional owning `featureId`. Distance measurements derive `value` from their
two endpoints; diameter measurements store the circle diameter and endpoints
across it. Notes may include `strokePoints`, an optional list of model-space
points for a freehand stroke.

The JSON is checked against the version 1 schema before it is replayed. Unknown
versions and unexpected fields are rejected rather than partially applied.
Each snapshot is limited to 256 picked topology references, 128 measurements,
and 128 notes. Each measurement or note can reference up to 32 topology items;
freehand strokes can contain up to 512 points. Note text is limited to 280
characters. A generated prompt, including its markup block, is limited to
63,000 characters; Studio reports when the prompt and markup together exceed
that limit.

## Demo evidence

[Open the Studio markup walkthrough bundle](https://github.com/w1ne/kernelCAD-web/tree/develop/docs/demos/studio-markup)
for a replayable example and the verification status for this change. Local
validation does not establish deployed behavior or hardware acceptance.
