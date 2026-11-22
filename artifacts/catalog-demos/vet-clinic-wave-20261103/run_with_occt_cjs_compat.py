#!/usr/bin/env python3
"""Run one command with the Emscripten UMD package explicitly typed as CJS.

Recent Node versions mis-detect the dependency's untyped UMD bundle. This
wrapper changes only its ignored node_modules package.json for the child
process, then restores the exact original bytes even when the command fails.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
PACKAGE = ROOT / 'node_modules' / 'replicad-opencascadejs' / 'package.json'

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True, help='log path relative to this bundle')
parser.add_argument('command', nargs=argparse.REMAINDER, help='command after --')
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ['--'] else args.command
if not command:
    raise SystemExit('provide a command after --')

original = PACKAGE.read_bytes()
manifest = json.loads(original)
manifest['type'] = 'commonjs'
PACKAGE.write_text(json.dumps(manifest, indent=2) + '\n')
try:
    run = subprocess.run(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
finally:
    PACKAGE.write_bytes(original)

output = BUNDLE / args.output
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(run.stdout)
print(f"command: {' '.join(command)}")
print(f'log: {output.relative_to(ROOT)}')
print(f'exit code: {run.returncode}')
if run.returncode != 0:
    sys.exit(run.returncode)
