// scripts/lib/whatsNewTemplate.ts
import { writeFileSync, existsSync, readFileSync } from 'node:fs';

export function whatsNewTemplate(opts: { module: string; partName: string }): string {
  return `# ${opts.module} — synchronized live-build demo

<!-- TODO: 1-paragraph capability gain blurb in plain English. Replace this comment + the line below before merging. -->

This release demonstrates the agent building **${opts.partName}** with synchronized live-build.

![Demo](./demo.mp4)
![Panel](./panel.png)
`;
}

export function writeWhatsNewIfMissing(path: string, content: string): void {
  if (existsSync(path)) return;
  writeFileSync(path, content, 'utf8');
}

export function whatsNewIsFilled(path: string): boolean {
  if (!existsSync(path)) return false;
  return !readFileSync(path, 'utf8').includes('TODO:');
}
