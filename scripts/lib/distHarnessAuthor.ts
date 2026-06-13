// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/distHarnessAuthor.ts
//
// Distills the dist-repo harness/AGENTS.md from the upstream CLAUDE.md.
// Per spec §6 Task 2:
//   INCLUDED: "CAD authoring discipline" (everything from the heading
//     down to the next ## heading).
//   EXCLUDED: "Demo discipline (v0.X.0-tag PR review rule)" — repo-
//     internal, ships only to upstream contributors.
//   APPENDED: a natively-authored "Multi-agent parallelization" section
//     spelling out the three buckets that must serialize when multiple
//     agents work on the same .kcad.ts source.

const PARALLELIZATION_SECTION = `## Multi-agent parallelization

When multiple agents (or a single agent dispatching subagents) work on
the same \`.kcad.ts\` source, serialize across these three buckets and
parallelize only within a bucket:

- **Mutating generation** — anything that writes to the \`.kcad.ts\` file
  or changes its evaluation: every \`add_*\` MCP edit
  tool, \`set_param\`, \`remove_feature\`.
- **Inspection** — read-only tools that observe the current evaluation:
  \`evaluate_script\`, \`inspect\`, \`query\`,
  \`lookup_diagnostics\`, \`why_did_this_fail\`, \`verify\`.
- **Render / review** — anything that produces a visual artifact:
  \`kernelcad render inspect\`, \`review_cad\`, screenshot capture.

Two agents inspecting the same source in parallel is fine. Two agents
rendering it in parallel is fine. Mixing buckets against the same
source produces stale views and corrupt state — sequence inspection
→ mutating generation → render → review.

Derived artifacts (STEP, STL, DXF, 3MF, GLB, URDF, SRDF, SDF, PNG,
MP4) are outputs, not source. Do not hand-edit them.
`;

export function authorHarnessAgentsMd(claudeMd: string): string {
  const cadDiscipline = extractSection(claudeMd, 'CAD authoring discipline');
  if (!cadDiscipline) {
    throw new Error(
      'distHarnessAuthor: source CLAUDE.md missing "CAD authoring discipline" section.',
    );
  }
  const head =
    '# Agent rules for kernelCAD skills\n\nThese rules apply to every agent that loads a kernelCAD skill, regardless of host.\n\n';
  return head + cadDiscipline.trim() + '\n\n' + PARALLELIZATION_SECTION;
}

function extractSection(src: string, headingText: string): string | null {
  // Match `## <heading>` until the next `## ` heading or end of string.
  const pattern = new RegExp(`^## ${escapeRegex(headingText)}\\b[\\s\\S]*?(?=^## |$(?![\\r\\n]))`, 'm');
  const m = pattern.exec(src);
  return m ? m[0] : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
