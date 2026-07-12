// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROBOT_HAND_WORKFLOW_WEIGHTS = {
  physicalCompleteness: 0.30,
  referenceFit: 0.22,
  parametricStability: 0.20,
  automationPotential: 0.13,
  validationCoverage: 0.15,
} as const;

export type RobotHandWorkflowId =
  | 'mechanism-templates'
  | 'reference-conditioned'
  | 'mesh-feature-fitting'
  | 'master-skeleton'
  | 'validation-loop';

export interface WorkflowScore {
  physicalCompleteness: number;
  referenceFit: number;
  parametricStability: number;
  automationPotential: number;
  validationCoverage: number;
}

export interface WorkflowCandidate {
  id: RobotHandWorkflowId;
  label: string;
  role: 'generator' | 'evidence-to-generator' | 'skeleton' | 'validator';
  inputs: string;
  builds: string;
  failureCaught: string;
  caveat: string;
  score: WorkflowScore;
}

export interface ScoredWorkflowCandidate extends WorkflowCandidate {
  weightedScore: number;
}

export interface WorkflowComparisonResult {
  weights: typeof ROBOT_HAND_WORKFLOW_WEIGHTS;
  candidates: ScoredWorkflowCandidate[];
  bestIndividual: ScoredWorkflowCandidate;
  recommendedCombination: {
    ids: RobotHandWorkflowId[];
    score: number;
    reason: string;
  };
}

const CANDIDATES: WorkflowCandidate[] = [
  {
    id: 'mechanism-templates',
    label: 'Mechanism Templates',
    role: 'generator',
    inputs: 'mechanism family, target DOF, rough envelope',
    builds: 'known-good palm, clevis, pin, tendon, and finger modules',
    failureCaught: 'missing joints, unsupported pins, floating visual parts',
    caveat: 'Reliable mechanically, but can drift visually when the reference has strong style cues.',
    score: {
      physicalCompleteness: 92,
      referenceFit: 58,
      parametricStability: 82,
      automationPotential: 72,
      validationCoverage: 68,
    },
  },
  {
    id: 'reference-conditioned',
    label: 'Reference-Conditioned CAD',
    role: 'evidence-to-generator',
    inputs: 'reference image or mesh landmarks plus mechanism family',
    builds: 'landmark-driven visible proportions with mechanical completion',
    failureCaught: 'visual drift, wrong thumb angle, lost palm/wrist language',
    caveat: 'Landmarks are manual until mesh or image extraction is added.',
    score: {
      physicalCompleteness: 88,
      referenceFit: 91,
      parametricStability: 76,
      automationPotential: 66,
      validationCoverage: 72,
    },
  },
  {
    id: 'mesh-feature-fitting',
    label: 'Mesh Feature Fitting',
    role: 'evidence-to-generator',
    inputs: 'segmented mesh regions, fitted planes, cylinders, boxes, axes',
    builds: 'CAD primitives fitted to visible mesh features',
    failureCaught: 'bad primitive fit, missing shaft axes, repeated-module mismatch',
    caveat: 'Promising for automation, but bad segmentation can create false confidence.',
    score: {
      physicalCompleteness: 58,
      referenceFit: 86,
      parametricStability: 54,
      automationPotential: 88,
      validationCoverage: 50,
    },
  },
  {
    id: 'master-skeleton',
    label: 'Master Skeleton',
    role: 'skeleton',
    inputs: 'datums, joint centers, axes, envelopes, motion arcs',
    builds: 'stable parametric skeleton that downstream solids follow',
    failureCaught: 'sideways hands, broken axes, unstable edits, impossible motion',
    caveat: 'Best as a control layer; still needs either templates or reference evidence for solids.',
    score: {
      physicalCompleteness: 84,
      referenceFit: 64,
      parametricStability: 94,
      automationPotential: 62,
      validationCoverage: 74,
    },
  },
  {
    id: 'validation-loop',
    label: 'Validation Loop',
    role: 'validator',
    inputs: 'candidate assembly, reference evidence, physical requirements',
    builds: 'acceptance gates, scoring, repair hints, reject/pass decision',
    failureCaught: 'floating parts, invalid mates, collisions, weak loads, visual drift',
    caveat: 'This is not a generator; it decides whether a generated model is acceptable.',
    score: {
      physicalCompleteness: 78,
      referenceFit: 72,
      parametricStability: 70,
      automationPotential: 76,
      validationCoverage: 96,
    },
  },
];

function weightedScore(score: WorkflowScore): number {
  const weights = ROBOT_HAND_WORKFLOW_WEIGHTS;
  return Math.round(
    score.physicalCompleteness * weights.physicalCompleteness
    + score.referenceFit * weights.referenceFit
    + score.parametricStability * weights.parametricStability
    + score.automationPotential * weights.automationPotential
    + score.validationCoverage * weights.validationCoverage,
  );
}

export function compareRobotHandWorkflows(): WorkflowComparisonResult {
  const candidates = CANDIDATES
    .map((candidate) => ({ ...candidate, weightedScore: weightedScore(candidate.score) }))
    .sort((a, b) => b.weightedScore - a.weightedScore);

  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const comboIds: RobotHandWorkflowId[] = ['reference-conditioned', 'master-skeleton', 'validation-loop'];
  const comboScore = Math.round(comboIds.reduce((sum, id) => sum + (byId.get(id)?.weightedScore ?? 0), 0) / comboIds.length);

  return {
    weights: ROBOT_HAND_WORKFLOW_WEIGHTS,
    candidates,
    bestIndividual: candidates[0],
    recommendedCombination: {
      ids: comboIds,
      score: comboScore,
      reason: 'Reference-conditioned CAD preserves visible fit, master skeletons provide stable parametrics, and the validation loop supplies physical acceptance.',
    },
  };
}

function bar(value: number): string {
  return `<div style="height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden"><div style="width:${value}%;height:8px;background:#2563eb"></div></div>`;
}

export function renderWorkflowComparisonHtml(result = compareRobotHandWorkflows()): string {
  const cards = result.candidates.map((candidate, index) => `
    <section style="border:1px solid #d4d4d8;border-radius:8px;background:#fff;padding:14px">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:start">
        <div>
          <div style="font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700">#${index + 1} ${candidate.role}</div>
          <h3 style="margin:4px 0 6px">${candidate.label}</h3>
        </div>
        <div style="font-size:28px;font-weight:800;color:#0f172a">${candidate.weightedScore}</div>
      </div>
      <svg viewBox="0 0 280 150" style="width:100%;height:150px;background:#f8fafc;border-radius:6px;margin:8px 0 12px">
        ${candidate.id === 'reference-conditioned' ? referenceSvg() : ''}
        ${candidate.id === 'mechanism-templates' ? templateSvg() : ''}
        ${candidate.id === 'mesh-feature-fitting' ? meshFitSvg() : ''}
        ${candidate.id === 'master-skeleton' ? skeletonSvg() : ''}
        ${candidate.id === 'validation-loop' ? validationSvg() : ''}
      </svg>
      <p style="margin:0 0 8px;color:#334155"><b>Inputs:</b> ${candidate.inputs}</p>
      <p style="margin:0 0 8px;color:#334155"><b>Builds:</b> ${candidate.builds}</p>
      <p style="margin:0 0 8px;color:#334155"><b>Failure caught:</b> ${candidate.failureCaught}</p>
      <p style="margin:0 0 12px;color:#7c2d12"><b>Caveat:</b> ${candidate.caveat}</p>
      <div style="display:grid;grid-template-columns:120px 1fr;gap:6px 10px;font-size:12px;color:#475569">
        <span>Physics</span>${bar(candidate.score.physicalCompleteness)}
        <span>Reference fit</span>${bar(candidate.score.referenceFit)}
        <span>Stability</span>${bar(candidate.score.parametricStability)}
        <span>Automation</span>${bar(candidate.score.automationPotential)}
        <span>Validation</span>${bar(candidate.score.validationCoverage)}
      </div>
    </section>
  `).join('');

  const html = `
    <h2>Robot Hand Workflow Benchmark</h2>
    <p class="subtitle">Thin prototypes scored against the same target: a reference-matched, physically valid parametric robot hand.</p>
    <div style="padding:14px;border:1px solid #bbf7d0;background:#f0fdf4;border-radius:8px;margin-bottom:14px">
      <h3 style="margin:0 0 6px">Recommended path: ${result.recommendedCombination.ids.join(' + ')}</h3>
      <p style="margin:0;color:#166534">${result.recommendedCombination.reason}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(260px,1fr));gap:12px">${cards}</div>
  `;

  return `${html.replace(/[ \t]+$/gm, '').trim()}\n`;
}

function templateSvg(): string {
  return `
    <rect x="110" y="76" width="68" height="50" rx="4" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="62" y="20" width="16" height="62" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="96" y="12" width="16" height="70" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="130" y="8" width="16" height="74" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="164" y="20" width="16" height="62" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <circle cx="70" cy="82" r="6" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
    <circle cx="104" cy="82" r="6" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
    <circle cx="138" cy="82" r="6" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
    <circle cx="172" cy="82" r="6" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>`;
}

function referenceSvg(): string {
  return `
    <path d="M108 72 h74 v58 h-74 z M60 16 h18 v68 M94 8 h18 v76 M128 6 h18 v78 M162 18 h18 v66 M178 92 l48 -24" fill="none" stroke="#94a3b8" stroke-width="3" stroke-dasharray="6 4"/>
    <rect x="110" y="76" width="68" height="50" rx="4" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="62" y="20" width="16" height="62" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="96" y="12" width="16" height="70" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="130" y="10" width="16" height="72" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="164" y="22" width="16" height="60" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <line x1="48" y1="86" x2="188" y2="86" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>`;
}

function meshFitSvg(): string {
  return `
    <path d="M106 74 C98 86 102 124 112 132 C132 140 164 140 182 130 C190 116 188 84 180 74 C158 66 126 66 106 74Z" fill="#cbd5e1" opacity=".7"/>
    <path d="M62 16 C50 46 56 72 70 88 C82 70 82 34 76 18Z" fill="#cbd5e1" opacity=".7"/>
    <path d="M96 8 C86 44 92 74 106 90 C118 70 118 28 110 10Z" fill="#cbd5e1" opacity=".7"/>
    <rect x="110" y="76" width="68" height="50" rx="4" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <rect x="62" y="20" width="16" height="62" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <rect x="96" y="12" width="16" height="70" rx="5" fill="none" stroke="#f59e0b" stroke-width="3"/>`;
}

function skeletonSvg(): string {
  return `
    <rect x="110" y="76" width="68" height="50" rx="4" fill="#d8d3c9" stroke="#334155" stroke-width="2" opacity=".6"/>
    <line x1="144" y1="132" x2="144" y2="10" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>
    <line x1="48" y1="86" x2="196" y2="86" stroke="#ef4444" stroke-width="3"/>
    <path d="M70 86 C60 58 62 34 70 16" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M104 86 C94 52 96 28 104 8" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>
    <path d="M138 86 C128 50 130 26 138 6" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>
    <circle cx="70" cy="86" r="5" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
    <circle cx="104" cy="86" r="5" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>
    <circle cx="138" cy="86" r="5" fill="#e5e7eb" stroke="#475569" stroke-width="2"/>`;
}

function validationSvg(): string {
  return `
    <rect x="110" y="76" width="68" height="50" rx="4" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="62" y="20" width="16" height="62" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="96" y="12" width="16" height="70" rx="5" fill="#d8d3c9" stroke="#334155" stroke-width="2"/>
    <rect x="202" y="28" width="24" height="24" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>
    <path d="M207 33 l14 14 M221 33 l-14 14" stroke="#dc2626" stroke-width="3"/>
    <rect x="42" y="112" width="24" height="24" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
    <path d="M47 124 l7 7 l10 -15" fill="none" stroke="#16a34a" stroke-width="3"/>
    <path d="M70 126 C108 144 166 144 202 122" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>`;
}

export function writeWorkflowComparisonHtml(path = 'artifacts/robot-hand-workflow-comparison/index.html'): string {
  const absPath = resolve(path);
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, renderWorkflowComparisonHtml());
  return absPath;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
const currentPath = fileURLToPath(import.meta.url);
if (invokedPath === currentPath) {
  const output = writeWorkflowComparisonHtml();
  console.log(output);
}
