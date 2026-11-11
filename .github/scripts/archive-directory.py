"""Create a deterministic ZIP from a freshly built release directory."""
from pathlib import Path
import os
import sys
import zipfile

source, destination = map(Path, sys.argv[1:])
with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(source.rglob("*")):
        if file.is_symlink():
            raise ValueError(f"Unexpected linked build output: {file}")
        if not file.is_file():
            continue
        info = zipfile.ZipInfo(file.relative_to(source).as_posix(), (1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if os.access(file, os.X_OK) else 0o100644) << 16
        archive.writestr(info, file.read_bytes())
