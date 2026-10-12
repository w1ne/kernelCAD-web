---
name: kernelcad-studio-paint
description: Show a kernelCAD model in Studio and act on the user's painted review marks. Use when the user wants to see the model, or says they marked/painted/circled something in Studio.
---

# Studio viewer and paint review

## Show the model

- After a green full `evaluate_script`, call `open_in_studio` **once** per
  project per response and give the user its URL. Reuse that URL; do not call
  it again in the same response. While `meshStatus` is `building`, poll
  `get_project`, not `open_in_studio`.
- For a later revision call `open_in_studio({ project: "<slug>", ... })` once;
  the new viewer replaces the old one.

## Paint review

In Studio the user can paint over the model to mark what to change. Fetch the
newest marks with `review_paint_peek_latest({})` (pass `paths_only: true` to
skip inline PNGs). The packet holds a screenshot, a red mask and the list of
parts the paint hit. Edit only those parts, re-evaluate, and show the revision.
If the tool returns `empty`, ask the user to paint and submit again. This tool
is only listed when the server can see the Studio session; if it is absent, ask
the user to describe the change in words.
