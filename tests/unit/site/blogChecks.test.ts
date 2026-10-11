// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// The checks that keep a post true to the model it is about: every kcad block
// evaluates clean, every quoted number or diagnostic matches the real
// `kernelcad evaluate --json` output, every image and video exists, and a
// draft never reaches the blog. Each failure names the file and the line.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { postFromSource, renderBlog, type RenderedPost } from '../../../site/scripts/build-blog';
import { checkOrphanPages, checkPost, type EvaluateJson, type Evaluator } from '../../../site/scripts/blogChecks';
import { createEvaluator } from '../../../site/scripts/blogEvaluator';

const FILE = 'docs/guide/a-how-to.md';
const MODEL = 'examples/demo/lines.kcad.ts';
const BROKEN = 'examples/demo/lines-broken.kcad.ts';
const FIELDS: Record<string, string> = {
  title: 'A how-to',
  summary: 'One line.',
  date: '2026-10-11',
  kind: 'guide',
  model: MODEL,
};

const MESSAGE = "tube.clearance.violated: tube 'fuel-b' is 11.24 mm from 'hyd-b'; the rule needs 12.00 mm.";

const OUTPUTS: Record<string, EvaluateJson> = {
  [MODEL]: {
    ok: true,
    featureCount: 4,
    diagnostics: [],
    tubes: {
      lines: [
        {
          name: 'fuel-a', system: 'fuel', od: 12.7, wall: 0.89, bendRadius: 38.1,
          cutLength: 309.2946801017711, bends: 2,
          xyz: [[0, 0, 0], [92, 0, 0], [92.00000000000001, 175, 0], [167, 175, 9.184850993605149e-15]],
          lra: [{ l: 53.900000000000006, r: 0, a: 90 }, { l: 98.80000000000001, r: 180, a: 90 }],
          lastStraight: 36.900000000000006,
          minClearance: { mm: 12.300000000000011, to: 'fuel-b' },
        },
        { name: 'fuel-b', system: 'fuel', cutLength: 309.2946801017711, bends: 2 },
      ],
      systems: [{ system: 'fuel', lines: 2 }],
    },
    ports: [
      { part: 'pump', name: 'out-a', origin: [60, -172, -232] },
      { part: 'pump', name: 'out-b', origin: [60, -197, -232] },
    ],
  },
  [BROKEN]: {
    ok: false,
    featureCount: 4,
    diagnostics: [{ code: 'tube.clearance.violated', severity: 'error', message: MESSAGE }],
  },
};

function fakeEvaluator(code: (source: string) => EvaluateJson = () => ({ ok: true, featureCount: 1, diagnostics: [] })): Evaluator {
  return {
    file: async (path) => {
      const output = OUTPUTS[path];
      if (!output) throw new Error(`no output for ${path}`);
      return output;
    },
    code: async (source) => code(source),
  };
}

let repo: string;

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'kc-blog-checks-'));
  for (const file of [MODEL, BROKEN]) {
    mkdirSync(join(repo, file, '..'), { recursive: true });
    writeFileSync(join(repo, file), 'return box(1, 1, 1);\n');
  }
  mkdirSync(join(repo, 'site/blog/a-how-to'), { recursive: true });
  writeFileSync(join(repo, 'site/blog/a-how-to/index.html'), '<!DOCTYPE html>\n');
  mkdirSync(join(repo, 'site/blog/old-post'), { recursive: true });
  writeFileSync(join(repo, 'site/blog/old-post/index.html'), '<!DOCTYPE html>\n');
  mkdirSync(join(repo, 'docs/demos'), { recursive: true });
  writeFileSync(join(repo, 'docs/demos/clip.mp4'), 'video');
  writeFileSync(join(repo, 'docs/demos/clip.mov'), 'video');
  writeFileSync(join(repo, 'examples/demo/lines.kcad.js'), 'return box(1, 1, 1);\n');
});

afterAll(() => {
  rmSync(repo, { recursive: true, force: true });
});

function guide(fields: Record<string, string>, body: string): string {
  return `---\n${Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\nThe lede.\n\n${body}`;
}

/** The line in the file of the first line of `body`: front matter, a blank line, the lede, a blank line. */
function bodyLine(fields: Record<string, string>): number {
  return Object.keys(fields).length + 2 + 4;
}

function rendered(body: string, fields: Record<string, string> = FIELDS): RenderedPost {
  const post = postFromSource(FILE, guide(fields, body));
  if (!post) throw new Error('expected a post');
  const built = renderBlog([post], { repoRoot: repo, drafts: true }).posts.find((p) => p.post.slug === 'a-how-to');
  if (!built) throw new Error('post not rendered');
  return built;
}

async function failures(body: string, fields: Record<string, string> = FIELDS, evaluator: Evaluator = fakeEvaluator()) {
  return (await checkPost(rendered(body, fields), evaluator, repo)).failures;
}

describe('quoted numbers and diagnostics', () => {
  it('pass when the number is the model output at the precision written', async () => {
    const body = 'Each line is 309.29 mm long.\n<!-- check: tubes.lines[name=fuel-a].cutLength = 309.29 -->\n';
    expect(await failures(body)).toEqual([]);
  });

  it('fail on a drifted number with the file, the line and both values', async () => {
    const body = 'Each line is 279.29 mm long.\n<!-- check: tubes.lines[name=fuel-a].cutLength = 279.29 -->\n';
    const [failure, ...rest] = await failures(body);
    expect(rest).toEqual([]);
    expect(failure.file).toBe(FILE);
    expect(failure.line).toBe(bodyLine(FIELDS) + 1);
    expect(failure.message).toContain('279.29');
    expect(failure.message).toContain('309.2946801017711');
    expect(failure.message).toContain(MODEL);
  });

  it('fail when the text above no longer shows the checked value', async () => {
    const body = 'Each line is 310 mm long.\n<!-- check: tubes.lines[name=fuel-a].cutLength = 309.29 -->\n';
    const [failure] = await failures(body);
    expect(failure.message).toMatch(/309\.29.*not shown in the paragraph above/);
  });

  it('do not take a longer number for the quoted one', async () => {
    const body = 'Each line is 1309.291 mm long.\n<!-- check: tubes.lines[name=fuel-a].cutLength = 309.29 -->\n';
    expect(await failures(body)).toHaveLength(1);
  });

  it('pick elements by key, by index and by several keys, and count them', async () => {
    const body = [
      'There are 2 lines; the second is `fuel-b`. Port `out-b` is at [60, -197, -232].',
      '<!-- check: tubes.lines.length = 2 -->',
      '<!-- check: tubes.lines[1].name = fuel-b -->',
      '<!-- check: ports[part=pump,name=out-b].origin = [60, -197, -232] -->',
      '',
    ].join('\n');
    expect(await failures(body)).toEqual([]);
  });

  it('name a selector that matches no element or more than one', async () => {
    const body = [
      'Port `out-a` is at [60, -172, -232] and the line is 309.29 mm.',
      '<!-- check: ports[part=pump].origin = [60, -172, -232] -->',
      '<!-- check: tubes.lines[name=fuel-z].cutLength = 309.29 -->',
      '',
    ].join('\n');
    const found = await failures(body);
    expect(found.map((f) => f.message)).toEqual([
      expect.stringContaining('matches 2 elements'),
      expect.stringContaining('matches no element'),
    ]);
  });

  it('compare a code block with a diagnostic of another model', async () => {
    const ok = `\`\`\`text\n${MESSAGE}\n\`\`\`\n<!-- check ${BROKEN}: diagnostics[code=tube.clearance.violated].message = block -->\n`;
    expect(await failures(ok)).toEqual([]);
    const drifted = ok.replace('11.24 mm', '11.00 mm');
    const [failure] = await failures(drifted);
    expect(failure.message).toContain(BROKEN);
    expect(failure.message).toContain('11.24 mm');
  });

  it('find a phrase in a diagnostic with contains', async () => {
    const body = `The message says the rule needs 12.00 mm.\n<!-- check ${BROKEN}: diagnostics[0].message contains the rule needs 12.00 mm -->\n`;
    expect(await failures(body)).toEqual([]);
  });

  it('compare a bend table block with the CSV the export writes for that line', async () => {
    const csv = [
      'name,fuel-a', 'od_mm,12.7', 'wall_mm,0.89', 'bend_radius_mm,38.1', 'cut_length_mm,309.295', '',
      'point,x_mm,y_mm,z_mm', '1,0.000,0.000,0.000', '2,92.000,0.000,0.000', '3,92.000,175.000,0.000', '4,167.000,175.000,0.000', '',
      'bend,l_mm,r_deg,a_deg', '1,53.900,0.000,90.000', '2,98.800,180.000,90.000', 'last_straight_mm,36.900',
    ].join('\n');
    const body = `\`\`\`text\n${csv}\n\`\`\`\n<!-- check: tubes.lines[name=fuel-a].bendTableCsv = block -->\n`;
    expect(await failures(body)).toEqual([]);
    expect(await failures(body.replace('2,98.800', '2,99.800'))).toHaveLength(1);
  });

  it('report a check comment it cannot read', async () => {
    const [failure] = await failures('Text.\n<!-- check: no operator here -->\n');
    expect(failure.message).toContain('cannot read the check');
    expect(failure.line).toBe(bodyLine(FIELDS) + 1);
  });

  it('need a model in the check or in the front matter', async () => {
    const { model: _model, ...noModel } = FIELDS;
    const [failure] = await failures('It is 2.\n<!-- check: tubes.lines.length = 2 -->\n', noModel);
    expect(failure.message).toContain('names no model');
  });
});

// Each comparison once with a value that matches and once with one that does
// not, so a comparison that always passes, or always fails, shows up here.
describe('each comparison, passing and failing', () => {
  const cases: ReadonlyArray<{
    name: string;
    pass: { body: string; fields?: Record<string, string>; evaluator?: Evaluator };
    fail: { body: string; fields?: Record<string, string>; evaluator?: Evaluator };
    message: string;
  }> = [
    {
      name: 'exact text',
      pass: { body: 'The second line is fuel-b.\n<!-- check: tubes.lines[1].name = fuel-b -->\n' },
      fail: { body: 'The second line is fuel-c.\n<!-- check: tubes.lines[1].name = fuel-c -->\n' },
      message: `tubes.lines[1].name in ${MODEL} is fuel-b; the article says fuel-c`,
    },
    {
      name: 'exact text against a boolean',
      pass: { body: 'It prints `"ok": true`.\n<!-- check: ok = true -->\n' },
      fail: { body: 'It prints `"ok": false`.\n<!-- check: ok = false -->\n' },
      message: `ok in ${MODEL} is true; the article says false`,
    },
    {
      name: 'contains',
      pass: { body: `It says the rule needs 12.00 mm.\n<!-- check ${BROKEN}: diagnostics[0].message contains the rule needs 12.00 mm -->\n` },
      fail: { body: `It says the rule needs 13.00 mm.\n<!-- check ${BROKEN}: diagnostics[0].message contains the rule needs 13.00 mm -->\n` },
      message: `diagnostics[0].message in ${BROKEN} is ${MESSAGE}; the article says it contains "the rule needs 13.00 mm"`,
    },
    {
      name: 'a list of numbers',
      pass: { body: 'It is at [60, -197, -232].\n<!-- check: ports[name=out-b].origin = [60, -197, -232] -->\n' },
      fail: { body: 'It is at [60, -197, -230].\n<!-- check: ports[name=out-b].origin = [60, -197, -230] -->\n' },
      message: `ports[name=out-b].origin in ${MODEL} is [60,-197,-232]; the article says [60, -197, -230]`,
    },
    {
      name: 'a whole number, rounded to no decimals',
      pass: { body: 'The nearest line is 12 mm away.\n<!-- check: tubes.lines[0].minClearance.mm = 12 -->\n' },
      fail: { body: 'The nearest line is 13 mm away.\n<!-- check: tubes.lines[0].minClearance.mm = 13 -->\n' },
      message: `tubes.lines[0].minClearance.mm in ${MODEL} is 12.300000000000011; the article says 13`,
    },
    {
      name: 'the model file suffix',
      pass: { body: 'Text.\n', fields: { ...FIELDS, model: MODEL } },
      fail: { body: 'Text.\n', fields: { ...FIELDS, model: 'examples/demo/lines.kcad.js' } },
      message: 'model examples/demo/lines.kcad.js must be a .kcad.ts file',
    },
    {
      name: 'the video file suffix',
      pass: { body: 'Text.\n', fields: { ...FIELDS, video: 'docs/demos/clip.mp4' } },
      fail: { body: 'Text.\n', fields: { ...FIELDS, video: 'docs/demos/clip.mov' } },
      message: 'video docs/demos/clip.mov must be a .mp4 file',
    },
    {
      name: "the check's own model",
      pass: { body: `It prints false.\n<!-- check ${BROKEN}: ok = false -->\n` },
      fail: { body: 'It prints false.\n<!-- check examples/demo/none.kcad.ts: ok = false -->\n' },
      message: "the check's model examples/demo/none.kcad.ts does not exist",
    },
    {
      name: 'a code line quoted from the model source',
      pass: { body: '```ts\nreturn box(1, 1, 1);\n```\n<!-- check: source contains block -->\n' },
      fail: { body: '```ts\nreturn box(2, 2, 2);\n```\n<!-- check: source contains block -->\n' },
      message: `the source of ${MODEL} does not contain the code block above`,
    },
    {
      name: 'a kcad block whose evaluation fails with no diagnostic',
      pass: { body: '```kcad\nreturn box(1, 1, 1);\n```\n', evaluator: fakeEvaluator(() => ({ ok: true, featureCount: 1, diagnostics: [] })) },
      fail: { body: '```kcad\nreturn box(1, 1, 1);\n```\n', evaluator: fakeEvaluator(() => ({ ok: false, featureCount: 0, diagnostics: [] })) },
      message: 'kcad block 1 does not evaluate clean: the evaluation failed',
    },
  ];

  it.each(cases)('$name: a matching value passes', async ({ pass }) => {
    expect(await failures(pass.body, pass.fields, pass.evaluator)).toEqual([]);
  });

  it.each(cases)('$name: a different value fails', async ({ fail, message }) => {
    const found = await failures(fail.body, fail.fields, fail.evaluator);
    expect(found.map((f) => f.message)).toEqual([message]);
  });

  it('reads the source of a model without evaluating it', async () => {
    const noEvaluation: Evaluator = {
      file: () => Promise.reject(new Error('evaluated')),
      code: () => Promise.reject(new Error('evaluated')),
    };
    const body = '```ts\nreturn box(1, 1, 1);\n```\n<!-- check: source contains block -->\n';
    expect(await failures(body, FIELDS, noEvaluation)).toEqual([]);
  });
});

describe('kcad blocks', () => {
  it('fail a block with an error or a warning, by block number and line', async () => {
    const body = '```kcad\nreturn box(1, 1, 1);\n```\n\n```kcad\nreturn box(2, 2, 2);\n```\n';
    const evaluator = fakeEvaluator((source) =>
      source.includes('box(2')
        ? { ok: true, featureCount: 1, diagnostics: [{ code: 'tube.spec.defaulted', severity: 'warning', message: 'no tubeSpec' }] }
        : { ok: true, featureCount: 1, diagnostics: [{ code: 'lint.hint', severity: 'info', message: 'fine' }] },
    );
    const [failure, ...rest] = await failures(body, FIELDS, evaluator);
    expect(rest).toEqual([]);
    expect(failure.line).toBe(bodyLine(FIELDS) + 4);
    expect(failure.message).toContain('kcad block 2');
    expect(failure.message).toContain('tube.spec.defaulted');
  });

  it('evaluate with the real kernel: a broken block fails the build', async () => {
    const body = '```kcad\nreturn box(10, 10, 10);\n```\n\n```kcad\nreturn notAShape(10);\n```\n';
    const found = await failures(body, FIELDS, createEvaluator(repo));
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('kcad block 2');
    expect(found[0].line).toBe(bodyLine(FIELDS) + 4);
  }, 120_000);
});

describe('images, video and model files', () => {
  it('fail an image, video or model that does not exist, at its line', async () => {
    const fields = { ...FIELDS, kind: 'use-case', model: 'examples/demo/missing.kcad.ts', video: 'docs/demos/missing.mp4' };
    const found = await failures('![A view](../../site/blog/a-how-to/missing.png "Caption.")\n', fields);
    expect(found.map((f) => [f.line, f.message])).toEqual([
      [6, expect.stringContaining('model examples/demo/missing.kcad.ts does not exist')],
      [7, expect.stringContaining('video docs/demos/missing.mp4 does not exist')],
      [bodyLine(fields), expect.stringContaining('missing.png does not exist')],
    ]);
  });

  it('fail an image outside site/', async () => {
    const [failure] = await failures('![A view](../../examples/demo/view.png "Caption.")\n');
    expect(failure.message).toContain('not under site/');
  });
});

describe('drafts', () => {
  const draft = postFromSource('docs/guide/later.md', guide({ ...FIELDS, status: 'draft', note: 'The owner rewrites this.' }, 'Text.\n'))!;
  const published = postFromSource(FILE, guide(FIELDS, 'Text.\n'))!;

  it('build to site/blog/drafts/ only when asked, and never to the index', () => {
    const normal = renderBlog([draft, published], { repoRoot: repo });
    expect(normal.files.map((f) => f.path).sort()).toEqual(['site/blog/a-how-to/index.html', 'site/blog/index.html']);

    const preview = renderBlog([draft, published], { repoRoot: repo, drafts: true });
    expect(preview.files.map((f) => f.path).sort()).toEqual([
      'site/blog/a-how-to/index.html',
      'site/blog/drafts/later/index.html',
      'site/blog/index.html',
    ]);
    const index = preview.files.find((f) => f.path === 'site/blog/index.html')!.html;
    expect(index).not.toContain('later');
    const page = preview.files.find((f) => f.path === 'site/blog/drafts/later/index.html')!.html;
    expect(page).toContain('<meta name="robots" content="noindex" />');
    expect(page).toContain('draft preview, not on the blog index');
    expect(page).toContain('The owner rewrites this.');
  });

  it('do not show the reviewer note on a published page', () => {
    const noted = postFromSource(FILE, guide({ ...FIELDS, note: 'Only for reviewers.' }, 'Text.\n'))!;
    const html = renderBlog([noted], { repoRoot: repo }).files[0].html;
    expect(html).not.toContain('Only for reviewers.');
  });

  it('a page left in site/blog/ by a post that is no longer published fails the build', () => {
    expect(checkOrphanPages(repo, ['a-how-to'])).toEqual([
      { file: 'site/blog/old-post/index.html', line: 1, message: expect.stringContaining('no published guide') },
    ]);
    expect(checkOrphanPages(repo, ['a-how-to', 'old-post'])).toEqual([]);
  });

  // A draft's images must not sit where the deploy picks them up. They may be
  // anywhere in the repository; the preview copies them next to its page.
  describe('images', () => {
    const { model: _model, ...noModel } = FIELDS;
    const later = (src: string) =>
      postFromSource('docs/guide/later.md', guide({ ...noModel, status: 'draft' }, `![A view](${src} "Caption.")\n`))!;

    it('a draft may keep an image outside site/, and its preview gets a copy next to the page', async () => {
      // A PNG signature and IHDR chunk for a 64 x 48 image.
      writeFileSync(join(repo, 'examples/demo/view.png'), Buffer.from('89504e470d0a1a0a0000000d49484452000000400000003000', 'hex'));
      const preview = renderBlog([later('../../examples/demo/view.png')], { repoRoot: repo, drafts: true });
      const page = preview.files.find((f) => f.path === 'site/blog/drafts/later/index.html')!.html;
      expect(page).toContain('<img src="view.png" alt="A view" width="64" height="48" loading="lazy" />');
      expect(preview.assets).toEqual([{ kind: 'copy', from: 'examples/demo/view.png', to: 'site/blog/drafts/later/view.png' }]);
      expect((await checkPost(preview.posts[0], fakeEvaluator(), repo)).failures).toEqual([]);
    });

    it('a published post still needs its images under site/', async () => {
      const [failure] = await failures('![A view](../../examples/demo/view.png "Caption.")\n');
      expect(failure.message).toContain('is not under site/');
    });

    it('an image outside the repository fails, draft or not', async () => {
      const preview = renderBlog([later('../../../outside.png')], { repoRoot: repo, drafts: true });
      const found = (await checkPost(preview.posts[0], fakeEvaluator(), repo)).failures;
      expect(found.map((f) => f.message)).toEqual(['image ../../../outside.png is outside the repository']);
      expect(preview.assets).toEqual([]);
    });

    it('files left in a site/blog directory that no published guide builds fail the build', () => {
      const other = mkdtempSync(join(tmpdir(), 'kc-blog-orphan-'));
      try {
        mkdirSync(join(other, 'site/blog/later'), { recursive: true });
        writeFileSync(join(other, 'site/blog/later/view.png'), 'png');
        expect(checkOrphanPages(other, [])).toEqual([
          { file: 'site/blog/later/view.png', line: 1, message: expect.stringContaining('no published guide builds site/blog/later/') },
        ]);
        expect(checkOrphanPages(other, ['later'])).toEqual([]);
      } finally {
        rmSync(other, { recursive: true, force: true });
      }
    });
  });
});
