// Local slideshow of the four inspect PNGs plus a caption card.
// Deployed behavior and hardware acceptance are separate checks.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const title = join('/tmp', 'kcad-step-inspect-title.png');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="396">
<rect width="480" height="396" fill="#ffffff"/>
<text x="240" y="168" text-anchor="middle" fill="#102033" font-size="22" font-family="Arial, Helvetica, sans-serif">Local inspect render of one STEP import</text>
<text x="240" y="206" text-anchor="middle" fill="#102033" font-size="15" font-family="Arial, Helvetica, sans-serif">Deployed behavior and hardware acceptance</text>
<text x="240" y="228" text-anchor="middle" fill="#102033" font-size="15" font-family="Arial, Helvetica, sans-serif">are separate checks.</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile(title);
const args = ['-y', '-loop', '1', '-t', '2', '-i', title];
for (const name of ['front', 'right', 'top', 'iso']) {
  args.push('-loop', '1', '-t', '2', '-i', join(here, `${name}.png`));
}
args.push(
  '-filter_complex', '[0][1][2][3][4]concat=n=5:v=1:a=0,format=yuv420p[v]',
  '-map', '[v]',
  '-r', '30',
  '-movflags', '+faststart',
  join(here, 'demo.mp4'),
);
const bin = process.env.FFMPEG ?? 'ffmpeg';
const run = spawnSync(bin, args, { stdio: 'inherit' });
if (run.status !== 0) process.exit(run.status ?? 1);
writeFileSync(join(here, 'video-evidence.json'), `${JSON.stringify({
  scope: 'Local inspect render. Deployed behavior and hardware acceptance are separate checks.',
  command: 'node docs/demos/step-inspect-views/make-video.mjs',
  ffmpeg: bin,
  frames: ['title', 'front.png', 'right.png', 'top.png', 'iso.png'],
  secondsEach: 2,
}, null, 2)}\n`);
