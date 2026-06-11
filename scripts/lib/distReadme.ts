// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/distReadme.ts
//
// Authors the dist repo's README.md. Native phrasing only — no
// comparator names, no Studio account claims, no hosted-billing
// language. Generated each release from filesystem-discovered
// entries so the skill list never drifts from the manifest.

import type { SkillEntry } from '../../src/agent/cli/lib/walkSkillTree';

export interface ReadmeInput {
  entries: SkillEntry[];
  version: string;
}

export function authorReadme({ entries, version }: ReadmeInput): string {
  const skillList = entries
    .slice()
    .sort((a, b) =>
      a.frontmatter.name < b.frontmatter.name
        ? -1
        : a.frontmatter.name > b.frontmatter.name
        ? 1
        : 0,
    )
    .map((e) => `- \`${e.frontmatter.name}\` — ${e.frontmatter.description}`)
    .join('\n');

  return `# kernelCAD skills

Cross-agent install for the kernelCAD skill tree. Local MCP by default; hosted MCP available as an opt-in fallback.

## Install

\`\`\`bash
npx skills add kernelcad/skills
\`\`\`

The \`skills\` CLI drops each \`SKILL.md\` into your agent's skill directory:

| Agent          | Project-scope path | Global-scope path     |
| :---           | :---               | :---                  |
| Claude Code    | \`.claude/skills/\`  | \`~/.claude/skills/\`   |
| Cursor         | \`.agents/skills/\`  | \`~/.cursor/skills/\`   |
| Codex          | \`.agents/skills/\`  | \`~/.codex/skills/\`    |
| GitHub Copilot | \`.agents/skills/\`  | \`~/.copilot/skills/\`  |

## Connect the kernelCAD MCP

### Local (default)

Install the CLI once:

\`\`\`bash
npm i -g kernelcad@^${minorOf(version)}
\`\`\`

Then register a local stdio MCP server in your agent (per-agent snippets below).

#### Claude Code

\`\`\`bash
claude mcp add kernelcad -- kernelcad mcp
\`\`\`

#### Cursor

Add the kernelcad MCP entry to your MCP config:

\`\`\`json
{ "mcpServers": { "kernelcad": { "command": "kernelcad", "args": ["mcp"] } } }
\`\`\`

#### Codex

Add the kernelcad MCP entry to your MCP config:

\`\`\`toml
[mcp_servers.kernelcad]
command = "kernelcad"
args = ["mcp"]
\`\`\`

#### GitHub Copilot

Add the kernelcad MCP entry to your settings:

\`\`\`json
{ "mcp.servers": { "kernelcad": { "command": "kernelcad", "args": ["mcp"] } } }
\`\`\`

### Hosted (opt-in fallback)

Set \`KERNELCAD_API_KEY\` in your environment and point your agent at \`https://api.kernelcad.com/mcp\` instead of the local stdio command.

## Skills in this distribution

${skillList}

## Source

This repo is generated from the kernelCAD source tree on each release tag. Edits to the SKILL.md files happen upstream — open a PR against the kernelCAD source repo, not here.
`;
}

function minorOf(version: string): string {
  const m = /^(\d+)\.(\d+)/.exec(version);
  return m ? `${m[1]}.${m[2]}` : '0.11';
}
