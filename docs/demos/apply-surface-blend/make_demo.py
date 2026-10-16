from pathlib import Path
import json, subprocess

root = Path(__file__).parent
result = json.loads((root / 'result.json').read_text())
code = result['new_code'] or '(no source returned)'
lines = [
  'kernelCAD MCP · apply_surface_blend',
  'Local source-checkout invocation · G2 edge fillet',
  '',
  'INPUT',
  'shape_binding: body',
  'radius: 2 mm',
  'selector: { face: "top" }',
  'continuity: G2',
  '',
  'AUTHORED SOURCE',
  *code.splitlines(),
  '',
  'LOCAL EVALUATION',
  f"ok: {result['ok']}",
  f"BREP valid: {result.get('sceneSummary', {}).get('valid')}",
  '',
  'Existing Shape.fillet API · blend-surface NURBS poles not extracted',
  'Local evaluation evidence · not deployment or hardware acceptance',
]
svg_lines = ''.join(f'<text x="44" y="{75+i*36}" font-size="{"28" if i == 0 else "20"}" fill="{"#78dce8" if i == 0 else "#e5edf5"}">{line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")}</text>' for i, line in enumerate(lines))
svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="900"><rect width="100%" height="100%" fill="#111827"/>{svg_lines}</svg>'
(root / 'demo.svg').write_text(svg)
subprocess.run(['rsvg-convert','-o',str(root/'demo.png'),str(root/'demo.svg')],check=True)
subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-loop','1','-i',str(root/'demo.png'),'-t','5','-r','24','-pix_fmt','yuv420p',str(root/'demo.mp4')],check=True)
subprocess.run(['ffmpeg','-v','error','-i',str(root/'demo.mp4'),'-f','null','-'],check=True)
(root/'video.json').write_text(json.dumps({'command':'python3 docs/demos/apply-surface-blend/make_demo.py','source':'demo.ts invocation and result.json from actual handler evaluation','duration_seconds':5,'full_decode_exit':0,'limits':['Local source-checkout evidence only','No deployment or hardware acceptance claim']},indent=2)+'\n')
print('Wrote and fully decoded five-second local workflow MP4')
