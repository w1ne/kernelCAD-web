// SPDX-License-Identifier: MIT
// Shared fixture plan. Variants rebuild a precise literal edit; this is not a
// claim about Studio parameter transport or an incremental session update.
export type ConnectionCase = {
  id: string; model: string; file: string; triangleBudget: number;
  values: Record<string, number | string | boolean>;
  original: boolean; canonicalDefault: boolean; expectedFailures: string[];
};
export const connectionModels = [
  { model: 'belt-magnet-separator', kit: 'mining', triangleBudget: 2600, scales: [.7, 1, 1.3], choice: 'magnetType', choices: ['selfCleaning', 'plateMagnet'], originalFailure: 'lifting-lug-0-belt-clearance' },
  { model: 'inline-skate', kit: 'sports', triangleBudget: 2400, scales: [.65, 1, 1.35], choice: '', choices: [''], originalFailure: 'middle-wheel-solid-overlap' },
  { model: 'strip-light-battens', kit: 'theatre-production', triangleBudget: 3000, scales: [.7, 1, 1.3], choice: '', choices: [''], originalFailure: 'pivot-axle-centre-r-cap' },
  { model: 'blackout-curtain-drive', kit: 'hydroponics', triangleBudget: 5000, scales: [.7, 1, 1.3], choice: 'screenPosition', choices: ['half', 'open', 'closed'], originalFailure: 'gearbox-mount-truss' },
  { model: 'roll-cage-trolley', kit: 'retail-store', triangleBudget: 2500, scales: [.7, 1, 1.3], choice: 'shelf', choices: ['shelf', 'none'], originalFailure: 'castor-axle-lf-fork-l' },
];
export const connectionCases: ConnectionCase[] = connectionModels.flatMap(spec => {
  const file = 'catalog/kits/' + spec.kit + '/' + spec.model + '.kcad.ts';
  const cases: ConnectionCase[] = [];
  for (const [branch, choice] of spec.choices.entries()) for (const scale of spec.scales) {
    const canonicalDefault = branch === 0 && scale === 1;
    cases.push({ id: spec.model + (canonicalDefault ? '.default' : '.' + (choice || 'base') + '.scale-' + scale), model: spec.model,
      file, triangleBudget: spec.triangleBudget, values: { scale, ...(spec.choice ? { [spec.choice]: choice } : {}) },
      original: false, canonicalDefault, expectedFailures: [] });
  }
  cases.push({ id: spec.model + '.original', model: spec.model, file, triangleBudget: spec.triangleBudget,
    values: {}, original: true, canonicalDefault: false, expectedFailures: [spec.originalFailure] });
  if (spec.model === 'blackout-curtain-drive') cases.push({ id: spec.model + '.original-closed', model: spec.model, file, triangleBudget: spec.triangleBudget,
    values: { screenPosition: 'closed' }, original: true, canonicalDefault: false, expectedFailures: ['rack--500-engagement', 'rack-500-box-outside-travel'] });
  return cases;
});
