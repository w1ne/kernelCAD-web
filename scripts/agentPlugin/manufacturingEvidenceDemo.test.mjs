import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd(), 'docs/demos/manufacturing-evidence-skills');
const evidence = JSON.parse(readFileSync(join(root, 'authenticated-evidence.json'), 'utf8'));
const study = JSON.parse(readFileSync(join(root, 'trade-study.json'), 'utf8'));
const stale = JSON.parse(readFileSync(join(root, 'evaluate-stale-example.json'), 'utf8')).result.structuredContent;
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

const normalize = (values, benefit) => {
  const xs = Object.values(values);
  const low = Math.min(...xs);
  const high = Math.max(...xs);
  if (high === low) return Object.fromEntries(Object.keys(values).map((key) => [key, 0.5]));
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [
    key,
    benefit ? (value - low) / (high - low) : (high - value) / (high - low),
  ]));
};

const rank = (weights, normalized) => {
  const scores = Object.fromEntries(Object.keys(evidence.variants).map((name) => [
    name,
    Object.entries(weights).reduce((sum, [metric, weight]) => sum + weight * normalized[metric][name], 0),
  ]));
  const ranking = Object.keys(scores).sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  return { scores, ranking };
};

test('demo source and render identities match the recorded evidence', () => {
  for (const variant of Object.values(evidence.variants)) {
    const path = join(root, variant.file);
    assert.equal(sha256(path), variant.sourceSha256, variant.file);
    assert.equal(statSync(path).size, variant.sourceBytes, variant.file);
  }
  for (const render of Object.values(evidence.render.images)) {
    assert.equal(sha256(join(root, render.file)), render.sha256, render.file);
  }
  assert.equal(sha256(join(root, evidence.video.file)), evidence.video.sha256);
  assert.equal(sha256(join(root, evidence.visualReview.contactSheet)), evidence.visualReview.contactSheetSha256);
});

test('negative control fails for the expected selector error', () => {
  assert.equal(stale.ok, false);
  assert.equal(stale.buildOk, false);
  assert.ok(stale.diagnostics.some((row) => row.code === 'query.empty' && row.featureId === 'fillet_1'));
});

test('readiness states preserve the structural trust boundary', () => {
  for (const [name, variant] of Object.entries(evidence.variants)) {
    assert.equal(variant.build.state, 'PASS', name);
    assert.equal(variant.dfm.state, 'PASS', name);
    assert.equal(variant.dfm.verdict, 'pass', name);
    assert.equal(variant.fea.state, 'WARN', name);
    assert.equal(variant.fea.meshTrusted, false, name);
  }
  assert.match(evidence.approvalGate, /No project overwrite, export, supplier quote, print, order, or external transfer occurred/);
});

test('trade-study scores and sensitivity recompute from raw evidence', () => {
  const raw = study.raw;
  const normalized = {
    massKg: normalize(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.massKg])), false),
    minSafetyFactorEstimate: normalize(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.minSafetyFactorEstimate])), true),
    maxDisplacementMm: normalize(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v.maxDisplacementMm])), false),
  };
  const base = rank(study.weights, normalized);
  assert.deepEqual(base.ranking, study.ranking);
  for (const [name, score] of Object.entries(base.scores)) {
    assert.ok(Math.abs(score - study.scores[name]) < 1e-12, `${name}: ${score}`);
  }
  for (const scenario of study.sensitivity) {
    const recomputed = rank(scenario.weights, normalized);
    assert.deepEqual(recomputed.ranking, scenario.ranking);
    assert.equal(recomputed.ranking[0] !== study.ranking[0], scenario.winnerChanged);
  }
  assert.equal(study.ranking[0], 't12');
  assert.equal(study.winnerStableToTestedWeightChanges, true);
});
