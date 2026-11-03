#!/usr/bin/env python3
"""Extract the final Vitest summary for the local catalog audit demo."""
import json
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
output = (BUNDLE / 'catalog-test-output.txt').read_text()
files = re.search(r'Test Files\s+(\d+) passed \((\d+)\)', output)
tests = re.search(r'Tests\s+(\d+) passed \((\d+)\)', output)
duration = re.search(r'Duration\s+([\d.]+)s', output)
if not files or not tests:
    raise SystemExit('final catalog test summary is missing from catalog-test-output.txt')
result = {
    'command': 'npx vitest run tests/integration/catalog/',
    'testFilesPassed': int(files.group(1)),
    'testFilesTotal': int(files.group(2)),
    'testsPassed': int(tests.group(1)),
    'testsTotal': int(tests.group(2)),
    'durationSeconds': float(duration.group(1)) if duration else None,
    'passed': files.group(1) == files.group(2) and tests.group(1) == tests.group(2),
}
(BUNDLE / 'catalog-tests.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
if not result['passed']:
    raise SystemExit(1)
