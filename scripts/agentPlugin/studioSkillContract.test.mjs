// SPDX-License-Identifier: MIT
// Regression checks for the cross-client workflow instructions, not a live MCP test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const skill = readFileSync(new URL('../../plugins/kernelcad/skills/kernelcad-studio-paint/SKILL.md', import.meta.url), 'utf8');
const text = skill.replace(/\s+/g, ' ');

test('requires explicit code and does not equate evaluation with a saved project', () => {
  assert.match(text, /open_in_studio` with the final `code`/);
  assert.match(text, /Evaluation alone does not confirm that a project was saved/);
});

test('rejoins an unfinished save with identical arguments', () => {
  assert.match(text, /status: "running"/);
  assert.match(text, /tool\.still-running/);
  assert.match(text, /Call `open_in_studio` again with the same arguments to join the running save/);
  assert.match(text, /Do not set `new_project: true`, alter the source, or claim a saved revision/);
  assert.doesNotMatch(text, /do not call it again in the same response/);
});

test('polls a saved building mesh without creating another save', () => {
  assert.match(text, /meshStatus: "building"/);
  assert.match(text, /poll `get_project\(\{ slug \}\)` for mesh readiness/);
  assert.match(text, /Do not repeat `open_in_studio` to poll a saved project's mesh/);
  assert.match(text, /`open_in_studio` again after success in that response/);
});

test('requires evidence before claiming a viewer was rendered', () => {
  assert.match(text, /`projectSaved`, `meshReady` and `previewDelivered` only when the response establishes/);
  assert.match(text, /`viewerPainted` requires an actual widget acknowledgement/);
  assert.match(text, /On clients without the interactive widget, provide the returned web URL/);
});

test('scopes revisions and painted feedback to the existing project', () => {
  assert.match(text, /open_in_studio\(\{ project: slug, code \}\)/);
  assert.match(text, /review_paint_peek_latest\(\{ slug \}\)/);
  assert.match(text, /Do not fetch unscoped latest feedback when the target project is known/);
  assert.doesNotMatch(text, /review_paint_peek_latest\(\{\}\)/);
});

test('reports failed saves and meshes without claiming an available model', () => {
  assert.match(text, /ok: false/);
  assert.match(text, /meshStatus: "failed"/);
  assert.match(text, /Do not describe a failed save or mesh as an available model/);
});
