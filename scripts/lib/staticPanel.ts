import sharp from 'sharp';
import { codeToHtml } from 'shiki';

export interface ScoreSummary {
  passed: boolean;
  value: number;
  criteria: string[];
}

export interface StaticPanelInput {
  promptText: string;
  scriptSource: string;
  heroFramePngBuffer: Buffer;
  score: ScoreSummary;
  outputPath: string;
}

const QW = 960;
const QH = 540;

function svgEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgPanel(
  width: number,
  height: number,
  title: string,
  body: string,
  bg = '#0c0c12',
  fg = '#e6e6e6',
): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${bg}" />
    <text x="24" y="48" font-family="JetBrains Mono, ui-monospace, monospace" font-size="22" fill="#9aa0a6">${svgEscape(title)}</text>
    <foreignObject x="24" y="72" width="${width - 48}" height="${height - 96}">
      <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: JetBrains Mono, ui-monospace, monospace; font-size: 18px; line-height: 1.4; color: ${fg}; white-space: pre-wrap; word-wrap: break-word;">
        ${body}
      </div>
    </foreignObject>
  </svg>`;
  return Buffer.from(svg);
}

async function svgToPng(svg: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(svg).resize(w, h, { fit: 'fill' }).png().toBuffer();
}

export async function composeStaticPanel(input: StaticPanelInput): Promise<void> {
  const promptSvg = svgPanel(QW, QH, 'Prompt', svgEscape(input.promptText));
  const promptPng = await svgToPng(promptSvg, QW, QH);

  const codeHtml = await codeToHtml(input.scriptSource, { lang: 'typescript', theme: 'github-dark' });
  const codeSvg = svgPanel(QW, QH, 'Generated .kcad.ts', codeHtml);
  const codePng = await svgToPng(codeSvg, QW, QH);

  const heroResized = await sharp(input.heroFramePngBuffer).resize(QW, QH, { fit: 'cover' }).png().toBuffer();

  const scoreText = `${input.score.passed ? 'PASS' : 'FAIL'}\nscore: ${input.score.value.toFixed(2)}\n\nCriteria:\n${input.score.criteria.map((c) => `• ${c}`).join('\n')}`;
  const scoreSvg = svgPanel(QW, QH, 'Harness score', svgEscape(scoreText), input.score.passed ? '#0d2818' : '#2a1010');
  const scorePng = await svgToPng(scoreSvg, QW, QH);

  const canvas = sharp({
    create: { width: 1920, height: 1080, channels: 3, background: { r: 0, g: 0, b: 0 } },
  });

  await canvas
    .composite([
      { input: promptPng, top: 0, left: 0 },
      { input: codePng, top: 0, left: QW },
      { input: heroResized, top: QH, left: 0 },
      { input: scorePng, top: QH, left: QW },
    ])
    .png()
    .toFile(input.outputPath);
}
