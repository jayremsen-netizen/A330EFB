"""Verify the tracked delivery contains project work and pinned upstream links."""
from pathlib import Path
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
config = json.loads((ROOT / 'config/upstreams.json').read_text('utf-8'))
raw = subprocess.check_output(['git', 'ls-files', '--stage', '-z'], cwd=ROOT)
entries = []
for record in raw.split(b'\0'):
    if not record:
        continue
    metadata, filename = record.split(b'\t', 1)
    mode, sha, stage = metadata.decode().split()
    entries.append((mode, sha, filename.decode('utf-8')))

errors = []
links = {name: sha for mode, sha, name in entries if mode == '160000'}
expected = {item['path']: item['commit'] for item in config['repositories']}
if links != expected:
    errors.append(f'Upstream gitlinks differ from the version lock: {links}')
forbidden = ('node_modules/', 'build-common/', 'build-a339x/', 'local-efb/public/',
             'local-efb/dist/', '.artifacts/', 'logs/', 'runtime/', 'tmp/', 'upstream/')
secret_patterns = [
    re.compile(r'gh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(r'github_pat_[A-Za-z0-9_]{30,}'),
    re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(r'https://[^\s/@:]+:[^\s/@]+@github\.com'),
]
text_suffixes = {'.py', '.js', '.cjs', '.mjs', '.ts', '.tsx', '.json', '.md',
                 '.html', '.css', '.yml', '.yaml', '.ps1', '.cmd', '.txt'}
total_bytes = 0
for mode, sha, name in entries:
    if mode == '160000':
        continue
    path = ROOT / name
    if name.startswith(forbidden) or name == 'local-extensions/data/a339-reference.json':
        errors.append(f'Generated or third-party source tracked: {name}')
    size = path.stat().st_size
    total_bytes += size
    if size > 45 * 1024 * 1024 or path.suffix.lower() in {'.exe', '.dll', '.zip', '.msi'}:
        errors.append(f'Unexpected binary or oversized file: {name}')
    if path.suffix.lower() in text_suffixes:
        text = path.read_text('utf-8-sig')
        if any(pattern.search(text) for pattern in secret_patterns):
            errors.append(f'Potential credential in {name}')
        if name.startswith(('scripts/', 'tests/', 'local-efb/', 'local-extensions/')):
            if re.search(r'[CD]:[/\\](?:Users|work)[/\\]', text, re.IGNORECASE):
                errors.append(f'Machine-specific path in executable source: {name}')
report = dict(status='PASS' if not errors else 'FAIL', tracked_files=len(entries),
              upstream_gitlinks=links, tracked_bytes=total_bytes, errors=errors)
output = ROOT / '.artifacts/repository-audit.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
print(json.dumps(report, ensure_ascii=False, indent=2))
sys.exit(1 if errors else 0)
