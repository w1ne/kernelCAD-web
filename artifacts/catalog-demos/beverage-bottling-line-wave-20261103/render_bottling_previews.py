#!/usr/bin/env python3
"""Render only this wave's 50 new previews through the catalog renderer."""
import importlib.util
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('bottling_assets', BUNDLE / 'generate_bottling_assets.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
ids = [asset[0] for asset in module.ASSETS]
node22 = Path('/home/andrii/.nvm/versions/node/v22.23.4/bin')
env = os.environ.copy()
if node22.is_dir():
    env['PATH'] = f"{node22}:{env.get('PATH', '')}"
command = [
    sys.executable,
    str(BUNDLE / 'run_with_occt_cjs_compat.py'),
    '--output',
    'catalog-preview-render-output.txt',
    '--',
    'npx', 'tsx', 'scripts/renderCatalogPreviews.ts', *ids,
]
run = subprocess.run(command, cwd=ROOT, env=env, check=False)
if run.returncode != 0:
    raise SystemExit(run.returncode)
