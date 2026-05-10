import sharp from 'sharp';

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

/** Wrap a single line to fit `maxCharsPerLine`. Whitespace-preserving but
 *  hard-breaks long single tokens (e.g. URLs, long identifiers). */
function wrapLine(line: string, maxCharsPerLine: number): string[] {
  if (line.length <= maxCharsPerLine) return [line];
  const words = line.split(/(\s+)/);
  const out: string[] = [];
  let buf = '';
  for (const w of words) {
    if (buf.length + w.length <= maxCharsPerLine) {
      buf += w;
    } else if (w.length > maxCharsPerLine) {
      if (buf) { out.push(buf); buf = ''; }
      for (let i = 0; i < w.length; i += maxCharsPerLine) {
        out.push(w.slice(i, i + maxCharsPerLine));
      }
    } else {
      out.push(buf);
      buf = w.trimStart();
    }
  }
  if (buf) out.push(buf);
  return out;
}

function svgPanel(
  width: number,
  height: number,
  title: string,
  body: string,
  bg = '#0c0c12',
  fg = '#e6e6e6',
): Buffer {
  // librsvg (sharp's renderer) doesn't reliably render <foreignObject> XHTML,
  // so we emit native SVG <text> elements with manual line wrapping. ~18 px
  // monospace ≈ 11 px per char; 24 px left margin both sides.
  const fontSize = 18;
  const lineHeight = Math.round(fontSize * 1.4);
  const charPx = Math.round(fontSize * 0.6);
  const maxCharsPerLine = Math.floor((width - 48) / charPx);
  const maxLines = Math.floor((height - 96) / lineHeight);
  const lines: string[] = [];
  for (const raw of body.split('\n')) {
    for (const wrapped of wrapLine(raw, maxCharsPerLine)) {
      lines.push(wrapped);
      if (lines.length >= maxLines) break;
    }
    if (lines.length >= maxLines) break;
  }
  const tspans = lines
    .map((l, i) => `<tspan x="24" dy="${i === 0 ? 0 : lineHeight}">${svgEscape(l) || ' '}</tspan>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${bg}" />
    <text x="24" y="48" font-family="JetBrains Mono, ui-monospace, monospace" font-size="22" fill="#9aa0a6">${svgEscape(title)}</text>
    <text x="24" y="${72 + fontSize}" font-family="JetBrains Mono, ui-monospace, monospace" font-size="${fontSize}" fill="${fg}" xml:space="preserve">${tspans}</text>
  </svg>`;
  return Buffer.from(svg);
}

async function svgToPng(svg: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(svg).resize(w, h, { fit: 'fill' }).png().toBuffer();
}

export async function composeStaticPanel(input: StaticPanelInput): Promise<void> {
  const promptSvg = svgPanel(QW, QH, 'Prompt', input.promptText);
  const promptPng = await svgToPng(promptSvg, QW, QH);

  // svgPanel does its own escaping + line wrapping; pass the raw source
  // (shiki HTML wasn't rendering under librsvg's foreignObject anyway).
  const codeSvg = svgPanel(QW, QH, 'Generated .kcad.ts', input.scriptSource);
  const codePng = await svgToPng(codeSvg, QW, QH);

  const heroResized = await sharp(input.heroFramePngBuffer).resize(QW, QH, { fit: 'cover' }).png().toBuffer();

  const scoreText = `${input.score.passed ? 'PASS' : 'FAIL'}\nscore: ${input.score.value.toFixed(2)}\n\nCriteria:\n${input.score.criteria.map((c) => `• ${c}`).join('\n')}`;
  const scoreSvg = svgPanel(QW, QH, 'Harness score', scoreText, input.score.passed ? '#0d2818' : '#2a1010');
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
