"""Download public, revision-pinned ONNX models; never executes repository code."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPECS = {
    "embedding": {
        "repository": "sentence-transformers/all-MiniLM-L6-v2",
        "revision": "1110a243fdf4706b3f48f1d95db1a4f5529b4d41",
        "files": ["onnx/model.onnx", "tokenizer.json", "tokenizer_config.json", "config.json", "sentence_bert_config.json", "1_Pooling/config.json", "README.md"],
        "max_length": 256,
        "output_dimension": 384,
        "pooling": "attention-mask mean; L2 normalization",
    },
    "reranker": {
        "repository": "cross-encoder/ms-marco-MiniLM-L6-v2",
        "revision": "233902d25c440f23af6f7d6e94d2946bac0bee0a",
        "files": ["onnx/model.onnx", "tokenizer.json", "tokenizer_config.json", "config.json", "README.md"],
        "max_length": 256,
        "output_dimension": 1,
        "pooling": "cross-encoder raw relevance logit",
    },
}


def fetch_model(name: str) -> dict:
    spec = SPECS[name]
    folder = ROOT / "models" / name
    folder.mkdir(parents=True, exist_ok=True)
    metadata_url = f"https://huggingface.co/api/models/{spec['repository']}/revision/{spec['revision']}?blobs=true"
    with urllib.request.urlopen(metadata_url, timeout=40) as response:
        remote = json.load(response)
    if remote["sha"] != spec["revision"]:
        raise RuntimeError("Model revision mismatch")
    siblings = {item["rfilename"]: item for item in remote["siblings"]}
    records = []
    for source in spec["files"]:
        target_name = "model.onnx" if source.endswith(".onnx") else source
        target = folder / target_name
        target.parent.mkdir(parents=True, exist_ok=True)
        url = f"https://huggingface.co/{spec['repository']}/resolve/{spec['revision']}/{source}"
        expected = siblings.get(source, {}).get("lfs", {}).get("sha256")
        if target.exists() and expected and hashlib.sha256(target.read_bytes()).hexdigest() == expected:
            pass
        else:
            temp = target.with_suffix(target.suffix + ".part")
            digest = hashlib.sha256()
            with urllib.request.urlopen(url, timeout=60) as response, temp.open("wb") as handle:
                while chunk := response.read(1024 * 1024):
                    handle.write(chunk)
                    digest.update(chunk)
                handle.flush()
                os.fsync(handle.fileno())
            if expected and digest.hexdigest() != expected:
                raise RuntimeError(f"SHA-256 mismatch for {name}/{source}")
            temp.replace(target)
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        records.append({"source_path": source, "local_path": target_name, "url": url, "bytes": target.stat().st_size, "sha256": digest, "remote_lfs_sha256": expected})
        print(json.dumps({"model": name, "downloaded": source, "bytes": target.stat().st_size, "sha256": digest}), flush=True)
    manifest = {**{k: v for k, v in spec.items() if k != "files"}, "license": remote.get("cardData", {}).get("license"), "downloaded_at": datetime.now(timezone.utc).isoformat(), "format": "official ONNX float32 weights; float32 embeddings/logits", "files": records}
    (folder / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", choices=["all", *SPECS], default="all")
    args = parser.parse_args()
    names = list(SPECS) if args.model == "all" else [args.model]
    with ThreadPoolExecutor(max_workers=2) as pool:
        manifests = list(pool.map(fetch_model, names))
    (ROOT / "evidence").mkdir(exist_ok=True)
    (ROOT / "evidence" / "models.json").write_text(json.dumps({
        "models": manifests,
        "operation": "download_pinned_non_generative_models",
        "inference_performed_by_this_script": False,
        "intended_runtime": "local ONNX CPU embedding and cross-encoder",
    }, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
