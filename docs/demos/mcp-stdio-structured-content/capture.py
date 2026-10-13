"""Capture the actual local SDK regression workflow as readable terminal frames."""
from pathlib import Path
import subprocess
import textwrap
from PIL import Image, ImageDraw, ImageFont

out = Path(__file__).resolve().parent
root = out.parents[2]
command = ['npx', 'vitest', 'run', 'tests/integration/mcp/stdioStructuredContent.test.ts']
run = subprocess.run(command, cwd=root, text=True, capture_output=True)
transcript = run.stdout + run.stderr
(out / 'verification.txt').write_text('$ ' + ' '.join(command) + '\n' + transcript + f'\nExit code: {run.returncode}\n')
if run.returncode:
    raise SystemExit(run.returncode)
font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 23)
frames = [
    ['kernelCAD MCP: structured tool responses', 'LOCAL VALIDATION / real SDK, in-memory transport', '', '1. Initialize client and server', '2. listTools caches lookup_api outputSchema', '3. callTool validates structuredContent', '4. Assert JSON text equals structuredContent', '', '$ npx vitest run', '  tests/integration/mcp/stdioStructuredContent.test.ts'],
    ['kernelCAD MCP: SDK regression result', 'LOCAL VALIDATION / no deployment or hardware claim', ''] + [line for line in transcript.splitlines() if line.strip()][:14],
]
for i, lines in enumerate(frames):
    frame = Image.new('RGB', (1280, 720), '#101820')
    draw = ImageDraw.Draw(frame)
    wrapped = [part for line in lines for part in (textwrap.wrap(line, width=83) or [''])]
    for j, line in enumerate(wrapped):
        draw.text((40, 45 + j * 37), line, font=font, fill='#b9e7ce' if j < 2 else '#ecf2f7')
    frame.save(out / f'frame-{i:02}.png')
subprocess.run(['ffmpeg', '-y', '-framerate', '1/5', '-i', str(out / 'frame-%02d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '24', str(out / 'demo.mp4')], check=True, capture_output=True)
