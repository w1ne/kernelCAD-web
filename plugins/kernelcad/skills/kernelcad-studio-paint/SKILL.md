---
name: kernelcad-studio-paint
description: Show a kernelCAD model in Studio and act on the user's painted review marks. Use when the user wants to see the model, or says they marked/painted/circled something in Studio.
---

# Studio viewer and paint review

## Save and show the model

After a successful full `evaluate_script`, call `open_in_studio` with the
final `code`. Evaluation alone does not confirm that a project was saved.
For an existing design, also pass `project` with the exact returned slug;
do not create a replacement project for a revision.

Handle the returned state before claiming completion:

- `status: "running"` or code `tool.still-running`: the save has not completed.
  Call `open_in_studio` again with the same arguments to join the running save.
  Do not set `new_project: true`, alter the source, or claim a saved revision
  while joining it. If it remains pending within the available execution
  budget, report that state rather than inventing a result.
- A completed save with `meshStatus: "building"`: reuse its returned slug,
  revision and URL, and poll `get_project({ slug })` for mesh readiness.
  Do not repeat `open_in_studio` to poll a saved project's mesh.
- A successful completed result: reuse the returned URL, revision and preview.
  Show one successful viewer per project per response; do not call
  `open_in_studio` again after success in that response.
- `ok: false` or `meshStatus: "failed"`: report the returned failure and repair
  the specific problem before retrying. Do not describe a failed save or mesh
  as an available model.

Report `projectSaved`, `meshReady` and `previewDelivered` only when the response
establishes those states. `viewerPainted` requires an actual widget
acknowledgement; a returned URL does not prove that the user's client rendered
it. On clients without the interactive widget, provide the returned web URL
and supported download links instead of claiming an in-chat viewer appeared.

For a later revision, retrieve the existing source with `get_project({ slug })`,
evaluate the changes, then call `open_in_studio({ project: slug, code })`.
Keep the exact project identity and return the new revision when it is saved.

## Paint review

In Studio the user can paint over the model to mark what to change. Fetch the
newest marks for that model with `review_paint_peek_latest({ slug })` using its
exact project slug (pass `paths_only: true` to skip inline PNGs). Do not fetch
unscoped latest feedback when the target project is known. The packet holds a
screenshot, a red mask and the list of parts the paint hit. Edit only those
parts, re-evaluate, and save the revision to the same project.
If the tool returns `empty`, ask the user to paint and submit again. This tool
is only available when the server can access the relevant feedback; if absent,
ask the user to describe the change in words.
