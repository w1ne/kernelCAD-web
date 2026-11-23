#!/usr/bin/env python3
"""Verify the generated index changed only the intended asset row."""

from hashlib import sha256
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BUNDLE = Path(__file__).resolve().parent
TARGET = ('industrial-plant', 'process-reactor-vessel')


def rows(path: Path) -> list[dict]:
    document = json.loads(path.read_text())
    return document.get('assets', document if isinstance(document, list) else [])


def main() -> None:
    index_rows = rows(ROOT / 'catalog/index.json')
    target_rows = [row for row in index_rows if (row.get('kit'), row.get('id')) == TARGET]
    if len(target_rows) != 1:
        raise SystemExit(f'Expected exactly one indexed asset row; found {len(target_rows)}')
    target = target_rows[0]
    source = ROOT / target['source']
    preview = ROOT / 'catalog/kits/industrial-plant/previews/process-reactor-vessel.png'
    source_digest = sha256(source.read_bytes()).hexdigest()
    preview_digest = sha256(preview.read_bytes()).hexdigest()
    if target.get('sourceSha256') != source_digest:
        raise SystemExit('Indexed sourceSha256 does not match the source file')
    if target.get('preview') != '/assets/industrial-plant-process-reactor-vessel.png' or not preview.is_file():
        raise SystemExit('Expected rendered catalog preview path is missing')

    non_target_rows = [row for row in index_rows if (row.get('kit'), row.get('id')) != TARGET]
    digest = sha256(json.dumps(non_target_rows, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    baseline_digest = (BUNDLE / 'before/index-nontarget-rows.sha256').read_text().split()[0]
    if digest != baseline_digest:
        raise SystemExit('Regeneration changed a non-target catalog row')

    before = json.loads((BUNDLE / 'before/index-row.json').read_text())
    for key in ('params', 'presets', 'stats', 'triangleBudget', 'preview'):
        if target[key] != before[key]:
            raise SystemExit(f'Unexpected target-row change in {key}')

    report = {
        'rows': len(index_rows),
        'target': f'{TARGET[0]}/{TARGET[1]}',
        'indexedSourceSha256': target['sourceSha256'],
        'sourceSha256': source_digest,
        'preview': target['preview'],
        'previewSha256': preview_digest,
        'triangleCount': target['stats']['triangles'],
        'triangleBudget': target['triangleBudget'],
        'nonTargetRowsUnchanged': True,
        'controlsPresetsStatsAndPreviewPathUnchanged': True,
    }
    (BUNDLE / 'index-verification.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
