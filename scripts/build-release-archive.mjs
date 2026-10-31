// Build a self-contained CLI archive for the current native runner.
// Run after `npm run build` and `npm prune --omit=dev`.
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const releaseDir = 'release';
const platformNames = new Map([
  ['linux-x64', 'linux-x86_64'],
  ['linux-arm64', 'linux-aarch64'],
  ['darwin-x64', 'darwin-x86_64'],
  ['darwin-arm64', 'darwin-arm64'],
  ['win32-x64', 'windows-x86_64'],
]);
const hostPlatform = platformNames.get(`${process.platform}-${process.arch}`);
const platform = process.env.KERNELCAD_RELEASE_PLATFORM ?? hostPlatform;

if (!hostPlatform) {
  throw new Error(`Unsupported release build host: ${process.platform}-${process.arch}`);
}
if (platform !== hostPlatform) {
  throw new Error(`Refusing cross-platform archive build: target ${platform}, host ${hostPlatform}`);
}

const archiveExtension = process.platform === 'win32' ? 'zip' : 'tar.gz';
const stageName = `kernelcad-${version}-${platform}`;
const stage = path.join(releaseDir, stageName);
const archive = path.join(releaseDir, `kernelcad-${version}-${platform}.${archiveExtension}`);

function requirePath(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing required release input: ${filePath}`);
}

rmSync(releaseDir, { recursive: true, force: true });
mkdirSync(path.join(stage, 'bin'), { recursive: true });
mkdirSync(path.join(stage, 'runtime'), { recursive: true });

for (const required of ['dist/cli/index.js', 'dist/headless-player', 'node_modules']) {
  requirePath(required);
}

for (const source of [
  'dist/cli',
  'dist/headless-player',
  'assets/parts',
  'assets/reference-parts',
  'assets/parts-seed',
  'licenses',
]) {
  if (existsSync(source)) {
    cpSync(source, path.join(stage, source), { recursive: true, dereference: true });
  }
}

for (const source of ['package.json', 'package-lock.json', 'README.md', 'LICENSE', 'NOTICE', 'ATTRIBUTION.md']) {
  if (existsSync(source)) cpSync(source, path.join(stage, source));
}

cpSync('node_modules', path.join(stage, 'node_modules'), { recursive: true, dereference: true });

const bundledNode = path.join(stage, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
cpSync(process.execPath, bundledNode);
if (process.platform !== 'win32') chmodSync(bundledNode, 0o755);

if (process.platform === 'win32') {
  writeFileSync(
    path.join(stage, 'bin', 'kernelcad.cmd'),
    '@echo off\r\n"%~dp0..\\runtime\\node.exe" "%~dp0..\\dist\\cli\\index.js" %*\r\n',
  );
  const powershell = [
    '$stage = $env:KERNELCAD_STAGE',
    '$archive = $env:KERNELCAD_ARCHIVE',
    'Compress-Archive -Path $stage -DestinationPath $archive -CompressionLevel Optimal',
  ].join('; ');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', powershell], {
    env: {
      ...process.env,
      KERNELCAD_STAGE: path.resolve(stage),
      KERNELCAD_ARCHIVE: path.resolve(archive),
    },
    stdio: 'inherit',
  });
} else {
  writeFileSync(
    path.join(stage, 'bin', 'kernelcad'),
    '#!/usr/bin/env sh\nDIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)\nexec "$DIR/runtime/node" "$DIR/dist/cli/index.js" "$@"\n',
  );
  chmodSync(path.join(stage, 'bin', 'kernelcad'), 0o755);
  execFileSync('tar', ['-czf', archive, '-C', releaseDir, stageName], { stdio: 'inherit' });
}

requirePath(archive);
console.log(`wrote ${archive}`);
