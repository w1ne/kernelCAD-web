import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectFindings, listSourceFiles } from './lib/qualityRatchet';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const findings = await collectFindings(root, listSourceFiles(root));
writeFileSync(resolve(root, 'scripts/lib/qualityBaseline.json'), JSON.stringify(findings, null, 2) + '\n');
console.log(`qualityBaseline.json: ${findings.length} findings`);
