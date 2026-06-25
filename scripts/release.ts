// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// --- Configuration ---
const PACKAGE_JSON_PATH = resolve(process.cwd(), 'package.json');
const RELEASE_NOTES_PATH = resolve(process.cwd(), 'RELEASE_NOTES.md');
const CHANGELOG_PATH = resolve(process.cwd(), 'CHANGELOG.md');

// --- Helpers ---
const run = (cmd: string, errorMsg: string) => {
    try {
        console.log(`Running: ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
    } catch {
        console.error(`❌ Error: ${errorMsg}`);
        process.exit(1);
    }
};

const getOutput = (cmd: string): string => {
    try {
        return execSync(cmd).toString().trim();
    } catch {
        return '';
    }
};

const getCurrentVersion = () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    return pkg.version;
};

const formatReleaseChanges = (log: string): string => {
    if (!log) return '- No significant changes captured in git log.';

    const groups = [
        { heading: 'Features', prefixes: ['feat'] },
        { heading: 'Fixes', prefixes: ['fix'] },
        { heading: 'Quality And Robustness', prefixes: ['test', 'refactor', 'perf'] },
        { heading: 'Documentation And Demos', prefixes: ['docs'] },
    ];
    const lines = log.split('\n').filter(Boolean);
    const used = new Set<number>();

    const sections = groups.flatMap((group) => {
        const matches = lines.filter((line, index) => {
            const normalized = line.replace(/^- /, '');
            const hit = group.prefixes.some((prefix) => normalized.startsWith(`${prefix}:`) || normalized.startsWith(`${prefix}(`));
            if (hit) used.add(index);
            return hit;
        });
        return matches.length ? [`### ${group.heading}\n\n${matches.join('\n')}`] : [];
    });

    const other = lines.filter((_, index) => !used.has(index));
    if (other.length) sections.push(`### Other Changes\n\n${other.join('\n')}`);

    return sections.join('\n\n');
};

// --- Main Script ---
const args = process.argv.slice(2);
const firstArg = args[0];
const fullQC = args.includes('--full');

const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const KEYWORDS = ['major', 'minor', 'patch'] as const;
type Keyword = (typeof KEYWORDS)[number];
type VersionMode = { kind: 'keyword'; value: Keyword } | { kind: 'explicit'; value: string };

let versionMode: VersionMode;
if (firstArg && KEYWORDS.includes(firstArg as Keyword)) {
    versionMode = { kind: 'keyword', value: firstArg as Keyword };
} else if (firstArg && SEMVER_RE.test(firstArg)) {
    versionMode = { kind: 'explicit', value: firstArg };
} else {
    console.error('Usage: npm run release -- [major|minor|patch | X.Y.Z] [--full]');
    process.exit(1);
}

function computeNextVersion(current: string, mode: VersionMode): string {
    if (mode.kind === 'explicit') return mode.value;
    const [maj, min, patch] = current.split('.').map(Number);
    if (mode.value === 'major') return `${maj + 1}.0.0`;
    if (mode.value === 'minor') return `${maj}.${min + 1}.0`;
    return `${maj}.${min}.${patch + 1}`;
}

const projectedVersion = computeNextVersion(getCurrentVersion(), versionMode);
const projectedLabel = versionMode.kind === 'keyword'
    ? `${versionMode.value} (→ ${projectedVersion})`
    : projectedVersion;
console.log(`🚀 Starting Release Process for ${projectedLabel}...`);
console.log(`🔎 QC Mode: ${fullQC ? 'full (qc:full)' : 'quick (qc)'}`);

// 0. Demo pre-flight (skip on patch bumps — patches reuse the iteration's hero)
const projectedPatch = Number(projectedVersion.split('.')[2]);
if (projectedPatch === 0) {
    console.log('\n🎬 Pre-flight: validating demo for new iteration...');
    try {
        const { selectHeroDemo } = await import('./lib/selectHeroDemo.js');
        const result = selectHeroDemo({
            packageVersion: projectedVersion,
            demosRoot: resolve(process.cwd(), 'docs/demos'),
        });
        console.log(`   ✓ ${result.iterationKey}/${result.task} ready (heroArtifact: ${result.heroArtifact ?? '<grandfathered>'})`);
    } catch (err) {
        console.error(`❌ Demo pre-flight failed: ${(err as Error).message}`);
        console.error('   Capture or fix the hero demo before releasing.');
        process.exit(1);
    }
}

// 1. Quality Checks
console.log('\n🔍 Running Quality Checks...');
run(fullQC ? 'npm run qc:full' : 'npm run qc', 'Quality checks failed.');

// 2. Git Status Check
const status = getOutput('git status --porcelain');
if (status) {
    console.error('❌ Error: Working directory is not clean. Commit changes first.');
    process.exit(1);
}

// 3. Get Commits for Release Notes
console.log('\n📝 Generating Release Notes...');
const lastTag = getOutput('git describe --tags --abbrev=0');
const commitLog = getOutput(`git log ${lastTag}..HEAD --pretty=format:"- %s (%h)"`);

// 4. Bump Version (this updates package.json; we tag manually after release notes).
console.log('\n📦 Bumping Version...');
const npmArg = versionMode.value;  // npm version accepts both keywords and X.Y.Z literals
run(`npm version ${npmArg} --no-git-tag-version`, 'Version bump failed.');
const newVersion = getCurrentVersion();
if (newVersion !== projectedVersion) {
    console.error(`❌ Version mismatch: projected ${projectedVersion} but package.json now says ${newVersion}`);
    process.exit(1);
}

// 5. Create Release Notes File
const date = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
const releaseChanges = formatReleaseChanges(commitLog);
const releaseNotes = `# kernelCAD v${newVersion}

## Summary

This release contains the changes merged since ${lastTag || 'the previous tag'}. For milestone releases, keep this summary focused on the main user-facing workflow and link the release demo or assets below.

## Highlights

${releaseChanges}

## Demo Or Assets

Release assets are attached separately when a version has a demo capture, static panel, or source reference that should be linked from GitHub Releases.

## Quality Gates

- Release QC: passed via \`${fullQC ? 'npm run qc:full' : 'npm run qc'}\`.
- Build date: ${date}.
- Platform: ${process.platform}.

## Install And Upgrade

\`\`\`bash
npm install -g kernelcad@${newVersion}
\`\`\`

For repo development:

\`\`\`bash
git clone https://github.com/w1ne/kernelCAD-web.git
cd kernelCAD-web
git checkout v${newVersion}
npm install
npm run dev
\`\`\`

## Links

- Web app: https://kernelcad.com
- Issues: https://github.com/w1ne/kernelCAD-web/issues
`;

writeFileSync(RELEASE_NOTES_PATH, releaseNotes);
console.log(`✅ Generated ${RELEASE_NOTES_PATH}`);

// Update CHANGELOG.md (prepend)
if (existsSync(CHANGELOG_PATH)) {
    const currentChangelog = readFileSync(CHANGELOG_PATH, 'utf-8');
    writeFileSync(CHANGELOG_PATH, releaseNotes + '\n\n' + currentChangelog);
    console.log(`✅ Updated ${CHANGELOG_PATH}`);
}

// 6. Commit and Tag
console.log('\n💾 Committing and Tagging...');
run('git add .', 'Git add failed');
run(`git commit -m "chore(release): v${newVersion}"`, 'Git commit failed');
run(`git tag -a v${newVersion} -m "Release v${newVersion}"`, 'Git tag failed');

// 7. Push
console.log('\n⬆️ Pushing to Remote...');
const currentBranch = getOutput('git branch --show-current');
run(`git push origin ${currentBranch}`, 'Git push branch failed');
run(`git push origin v${newVersion}`, 'Git push tag failed');

// 8. Publish and verify the GitHub Release. A pushed git tag is not a
// completed release: GitHub's Latest release marker is what users see.
console.log('\n📣 Publishing GitHub Release...');
run(
    `gh release create v${newVersion} --title "v${newVersion} — kernelCAD release" --notes-file ${RELEASE_NOTES_PATH} --latest`,
    'GitHub Release creation failed.',
);
run(
    'KERNELCAD_RELEASE_AUDIT_TAGS=1 KERNELCAD_RELEASE_AUDIT_REMOTE=1 KERNELCAD_RELEASE_AUDIT_GITHUB=1 npm run test:package',
    'Release hygiene audit failed.',
);

console.log(`\n🎉 Release v${newVersion} Completed Successfully!`);
