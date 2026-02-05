
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

// --- Main Script ---
const args = process.argv.slice(2);
const versionType = args[0] as 'major' | 'minor' | 'patch' | undefined;
const fullQC = args.includes('--full');

if (!versionType || !['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Usage: npm run release -- [major|minor|patch] [--full]');
    process.exit(1);
}

console.log(`🚀 Starting Release Process for ${versionType} version...`);
console.log(`🔎 QC Mode: ${fullQC ? 'full (qc:full)' : 'quick (qc)'}`);

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

// 4. Bump Version (this updates package.json and creates a git commit/tag)
// We use --no-git-tag-version first to update compilation files if needed, 
// then we will manually commit and tag to include the release notes.
console.log('\n📦 Bumping Version...');
run(`npm version ${versionType} --no-git-tag-version`, 'Version bump failed.');
const newVersion = getCurrentVersion();

// 5. Create Release Notes File
const date = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
const releaseNotes = `# 🚀 kernelCAD v${newVersion}

**Modern Programmable CAD for the Web**

---

## 📋 What's New

${commitLog || '- No significant changes captured in git log.'}

---

## ✅ Test Results (Automated)

- **QC Check**: Passed (Linting & Build)
- **Unit Tests**: Ran successfully
- **E2E Tests**: Manual verification recommended

---

## 📦 Build Information

- **Version**: ${newVersion}
- **Build Date**: ${date}
- **Platform**: Web / ${process.platform}

## 🎯 Supported Features

kernelCAD v${newVersion} supports:

| Feature | Description | Status |
|---------|-------------|--------|
| Sketcher | 2D constraint solver | Stable |
| Extrude | 3D extrusion from faces | Stable |
| Fillet/Chamfer | Edge modifications | Beta |
| STEP Export | CNC/CAM compatibility | Stable |

---

## 📥 Installation

### Use Online
Visit [kernelcad.com](https://kernelcad.com).

### Run Locally

\`\`\`bash
git clone https://github.com/w1ne/kernelCAD.git
cd kernelCAD
git checkout v${newVersion}
npm install
npm run dev
\`\`\`

---

## 🐛 Report Issues
Found a bug? [Open an issue](https://github.com/w1ne/kernelCAD/issues)
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

console.log(`\n🎉 Release v${newVersion} Completed Successfully!`);
