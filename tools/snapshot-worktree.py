"""Create a local recovery snapshot without committing or changing source files."""
import hashlib
import json
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args])


def snapshot(root):
    root = Path(root).resolve(strict=True)
    common = Path(git(root, "rev-parse", "--path-format=absolute", "--git-common-dir").decode().strip())
    branch = git(root, "branch", "--show-current").decode().strip()
    before = git(root, "status", "--porcelain=v1", "-z")
    head = git(root, "rev-parse", "HEAD").decode().strip()
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    dest = common / "gellow-recovery" / (stamp + "-" + root.name)
    dest.mkdir(parents=True, exist_ok=False)
    tracked = git(root, "ls-files", "-z")
    untracked = git(root, "ls-files", "--others", "--exclude-standard", "-z")
    names = sorted(set(n.decode("utf-8") for n in (tracked + untracked).split(b"\0") if n))
    (dest / "status.bin").write_bytes(before)
    (dest / "untracked.bin").write_bytes(untracked)
    (dest / "staged.patch").write_bytes(git(root, "diff", "--cached", "--binary", "--no-ext-diff", "--no-textconv"))
    (dest / "unstaged.patch").write_bytes(git(root, "diff", "--binary", "--no-ext-diff", "--no-textconv"))
    hashes = {}
    missing = []
    with zipfile.ZipFile(dest / "files.zip", "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in names:
            source = root / name
            if source.is_symlink():
                raise RuntimeError("Symlinks require a separate reviewed backup: " + name)
            if not source.exists():
                missing.append(name)
                continue
            if not source.is_file() or not source.resolve().is_relative_to(root):
                raise RuntimeError("Unsupported snapshot path: " + name)
            data = source.read_bytes()
            hashes[name] = hashlib.sha256(data).hexdigest()
            archive.writestr(name, data)
    for name, digest in hashes.items():
        if hashlib.sha256((root / name).read_bytes()).hexdigest() != digest:
            raise RuntimeError("Source changed during snapshot: " + name)
    if any((root / name).exists() for name in missing):
        raise RuntimeError("Missing source changed during snapshot")
    if git(root, "status", "--porcelain=v1", "-z") != before or git(root, "rev-parse", "HEAD").decode().strip() != head:
        raise RuntimeError("Git state changed during snapshot")
    manifest = {"complete": True, "root": str(root), "branch": branch, "head": head,
                "utc": stamp, "ignored_files_included": False, "missing": missing, "sha256": hashes}
    (dest / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(str(dest))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python snapshot-worktree.py WORKTREE_PATH")
    snapshot(sys.argv[1])
