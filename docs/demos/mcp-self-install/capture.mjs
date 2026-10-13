// Local validation demo: real command output replay, no deployed/host acceptance claim.
// Run from repo root after npm run build:cli:
// node docs/demos/mcp-self-install/capture.mjs
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const bundle = resolve('docs/demos/mcp-self-install');
const scratch = resolve('.superpowers/mcp-self-install-demo');
mkdirSync(scratch, { recursive: true });
const slides = [];
const add = (title, lines) => slides.push({ title, lines });
const server = createServer((req, res) => {
  if (req.url !== '/llms.txt') { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(readFileSync('site/llms.txt'));
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
try {
  const response = await fetch(`http://127.0.0.1:${server.address().port}/llms.txt`);
  const guide = await response.text();
  if (!response.ok || !guide.startsWith('# kernelCAD')) throw new Error('Discovery failed');
  add('1 / Discover installation instructions', [
    '$ fetch local site /llms.txt', `HTTP ${response.status} | ${response.headers.get('content-type')}`,
    guide.split('\n')[0], '', 'Hosted MCP: https://mcp.kernelcad.com/mcp',
    'Claude Code, Codex, Cursor, VS Code + local npm instructions',
    'Prompt: look at kernelcad.com and install the mcp',
  ]);
} finally {
  await new Promise(done => server.close(done));
}
const packOutput = execFileSync('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', scratch], { encoding: 'utf8' });
// Some npm versions emit prepare output before the JSON result.
const packed = JSON.parse(packOutput.slice(packOutput.indexOf('[\n  {')))[0];
execFileSync('tar', ['-xzf', join(scratch, packed.filename), '-C', scratch]);
const cli = join(scratch, 'package/dist/cli/index.js');
const pkg = JSON.parse(readFileSync(join(scratch, 'package/package.json'), 'utf8'));
const configDir = join(scratch, 'cursor');
rmSync(configDir, { recursive: true, force: true });
mkdirSync(configDir, { recursive: true });
const installed = execFileSync(process.execPath, [cli, 'install', '--cursor', '--config-dir', configDir], { encoding: 'utf8' });
const config = JSON.parse(readFileSync(join(configDir, 'mcp.json'), 'utf8'));
if (!config.mcpServers.kernelcad) throw new Error('MCP configuration missing');
add('2 / Write sandbox host configuration', [
  '$ kernelcad install --cursor --config-dir <sandbox>', ...installed.trim().split('\n'),
  '', 'Result: one kernelcad MCP entry', 'User host configuration was not edited.',
  'Configuration written; connection checked separately below.',
]);
const skills = join(scratch, 'skills');
execFileSync(process.execPath, [cli, 'skill', 'install', skills], {
  env: { ...process.env, KERNELCAD_SUPPRESS_DEPRECATION: '1' }, stdio: 'pipe',
});
const paths = readdirSync(skills, { recursive: true }).filter(path => path.endsWith('SKILL.md'));
for (const path of paths) {
  if (parse(readFileSync(join(skills, path), 'utf8').split('---')[1]).metadata.version !== pkg.version) {
    throw new Error(`Version mismatch: ${path}`);
  }
}
add('3 / Verify skills from the npm tarball', [
  '$ npm pack --ignore-scripts', '$ <packed CLI> skill install <sandbox skills>',
  `package.json version: ${pkg.version}`, `Installed SKILL.md files: ${paths.length}`,
  `Every metadata.version: ${pkg.version}`, '', 'PASS: package and installed skill versions match',
]);
const client = new Client({ name: 'self-install-validation', version: '1.0.0' });
const transport = new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'],
  env: { ...process.env, KERNELCAD_TELEMETRY: '0', DO_NOT_TRACK: '1' }, stderr: 'pipe' });
try {
  await client.connect(transport);
  const info = client.getServerVersion();
  const { tools } = await client.listTools();
  const result = await client.callTool({ name: 'lookup_api', arguments: {} });
  if (info.version !== pkg.version || result.isError || !result.content.length) throw new Error('MCP verification failed');
  add('4 / Verify the packaged MCP connection', [
    '$ MCP initialize -> tools/list -> lookup_api({})',
    `Server: ${info.name} ${info.version}`, `Advertised tools: ${tools.length}`,
    `lookup_api: success (${result.content.length} content block)`, '',
    'PASS: connected; skill version matches MCP server version',
    'Local validation only. No deployment or CAD/hardware acceptance.',
  ]);
} finally {
  await client.close();
}
const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
for (const [index, slide] of slides.entries()) {
  const lines = slide.lines.flatMap(line => line.match(/.{1,95}/g) ?? ['']);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="810">
    <rect width="1440" height="810" fill="#101923"/>
    <text x="64" y="70" font-family="Arial" font-size="25" fill="#8dd7bd">kernelCAD | MCP self-install | LOCAL VALIDATION</text>
    <text x="64" y="144" font-family="Arial" font-size="36" fill="#ffffff">${xml(slide.title)}</text>
    ${lines.map((line, n) => `<text x="64" y="${218 + n * 40}" font-family="Menlo,monospace" font-size="22" fill="#d8e4ed">${xml(line)}</text>`).join('')}
    <text x="64" y="764" font-family="Arial" font-size="22" fill="#8dd7bd">Actual command output replay | local sandbox | not deployed</text></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(join(scratch, `frame-${index}.png`));
}
const concat = slides.map((_, i) => `file '${join(scratch, `frame-${i}.png`)}'\nduration 5`).join('\n');
writeFileSync(join(scratch, 'frames.txt'), `${concat}\nfile '${join(scratch, 'frame-3.png')}'\n`);
execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', join(scratch, 'frames.txt'), '-r', '30',
  '-t', String(slides.length * 5), '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(bundle, 'demo.mp4')], { stdio: 'pipe' });
writeFileSync(join(bundle, 'verification.json'), JSON.stringify({
  capturedAt: new Date().toISOString(), provenance: 'actual local command output replay',
  packageVersion: pkg.version, skillCount: paths.length, slides,
  invocation: 'npm run build:cli && node docs/demos/mcp-self-install/capture.mjs',
  settings: { resolution: '1440x810', frameRate: 30, secondsPerSlide: 5, codec: 'libx264', crf: 20 },
  deployed: false, hardwareAcceptance: false,
}, null, 2) + '\n');
console.log('Demo, source and verification bundle:', bundle);
