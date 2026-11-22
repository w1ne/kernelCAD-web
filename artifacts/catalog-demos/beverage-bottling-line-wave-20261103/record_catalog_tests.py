#!/usr/bin/env python3
"""Summarize the retained Vitest catalog-integration output."""
import json
import re
from pathlib import Path

BUNDLE = Path(__file__).resolve().parent
text = (BUNDLE / 'catalog-test-output.txt').read_text(errors='replace')
text = re.sub(r'\x1b\[[0-9;]*m', '', text)
file_lines = [line.strip() for line in text.splitlines() if re.search(r'Test Files\s+', line)]
test_lines = [line.strip() for line in text.splitlines() if re.search(r'\bTests\s+', line)]
if not file_lines or not test_lines:
    raise SystemExit('could not find Vitest summary lines in catalog-test-output.txt')
file_line, test_line = file_lines[-1], test_lines[-1]
if 'failed' in file_line.lower() or 'failed' in test_line.lower():
    raise SystemExit('catalog integration suite contains failed tests')

def passed_count(line):
    match = re.search(r'(\d+)\s+passed', line)
    return int(match.group(1)) if match else None

files_passed = passed_count(file_line)
tests_passed = passed_count(test_line)
if files_passed is None or tests_passed is None:
    raise SystemExit('could not parse passed file/test totals')
result = {
    'passed': True,
    'filesPassed': files_passed,
    'testsPassed': tests_passed,
    'fileSummary': file_line,
    'testSummary': test_line,
    'summary': f'{tests_passed} tests across {files_passed} files passed',
}
(BUNDLE / 'catalog-tests.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result, indent=2))
