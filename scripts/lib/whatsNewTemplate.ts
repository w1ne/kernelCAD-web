// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// scripts/lib/whatsNewTemplate.ts
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

export interface WhatsNewArgs {
  module: string;
  partName: string;
  heroArtifact: string;
}

export function whatsNewTemplate(opts: WhatsNewArgs): string {
  return `# ${opts.module} — synchronized live-build demo

## Hero artifact

${opts.heroArtifact}

## Why memorable

<!-- TODO: Replace each bullet's content (after the colon) with a 1-line answer. Required by memorable-builds-policy spec (in kernelCAD-private) §1. -->

- Recognizable in one second: TODO:
- New tool central: TODO:
- Reads at 360°: TODO:

## What's new

<!-- TODO: 1-paragraph capability gain blurb in plain English. -->

This release demonstrates the agent building **${opts.partName}** with synchronized live-build.

![Demo](./demo.mp4)
![Panel](./panel.png)
`;
}

export function writeWhatsNewIfMissing(path: string, content: string): void {
  if (existsSync(path)) return;
  writeFileSync(path, content, 'utf8');
}

const REQUIRED_HEADERS = ['## Hero artifact', '## Why memorable', "## What's new"];
const WHY_MEMORABLE_BULLETS = [
  'Recognizable in one second:',
  'New tool central:',
  'Reads at 360°:',
];

export function whatsNewIsFilled(path: string): boolean {
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  if (text.includes('TODO:')) return false;
  for (const h of REQUIRED_HEADERS) {
    if (!text.includes(h)) return false;
  }
  for (const bullet of WHY_MEMORABLE_BULLETS) {
    // Match `- <bullet> <non-empty content>` on the same line — fail if content is blank or whitespace-only.
    // Use [^\S\n]* to avoid crossing line boundaries (plain \s* would match the next bullet's content).
    const escaped = bullet.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`-[^\\S\\n]*${escaped}[^\\S\\n]*(\\S[^\\n]*)`, 'm');
    if (!re.test(text)) return false;
  }
  return true;
}
