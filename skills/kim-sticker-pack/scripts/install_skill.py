#!/usr/bin/env python3
"""Copy this skill to a selected host location. No models, services or config changes."""
import argparse
from pathlib import Path
import shutil

def install(host, project=None, user=False):
    if host not in ('codex', 'claude') or (project is None) == (not user):
        raise ValueError('Choose codex/claude and exactly one project or user scope')
    root = Path.home() if user else Path(project).expanduser()
    if not root.is_dir(): raise ValueError('Scope directory must already exist')
    root = root.resolve()
    parent = root / ('.agents' if host == 'codex' else '.claude') / 'skills'
    target = parent / 'kim-sticker-pack'
    for node in [parent.parent, parent, target]:
        if node.is_symlink(): raise ValueError('Refusing a symlink in the installation path')
    if target.exists(): raise ValueError('Skill already exists; compare and migrate manually')
    source = Path(__file__).resolve().parents[1]
    if target.is_relative_to(source): raise ValueError('Cannot install inside the source package')
    for node in source.rglob('*'):
        if node.is_symlink(): raise ValueError('Source package must not contain symlinks')
    parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, target, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    return target

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host', required=True, choices=['codex', 'claude'])
    scope = parser.add_mutually_exclusive_group(required=True)
    scope.add_argument('--project', type=Path); scope.add_argument('--user', action='store_true')
    args = parser.parse_args()
    try: print(install(args.host, args.project, args.user))
    except (ValueError, OSError) as error: parser.exit(2, str(error) + '\n')
