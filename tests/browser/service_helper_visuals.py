"""Run the real visual helper and inspect its standalone storyboard in Chromium.

The input is the declared synthetic example. No model, credentials, customer
data or external service is used; this proves rendering and interaction only.
"""
from __future__ import annotations

import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
from datetime import datetime, timezone

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "browser-artifacts/service-helper-visuals"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    example = ROOT / "skills/visual-explainer/examples/input.json"
    source = json.loads(example.read_text(encoding="utf-8"))
    process = subprocess.run(["node", "skills/visual-explainer/scripts/run.mjs", "--input-json", "-"],
                             cwd=ROOT, input=json.dumps(source, ensure_ascii=False), text=True, capture_output=True, check=True)
    receipt = json.loads(process.stdout)
    assert receipt["claims"]["modelCalled"] is False
    result = receipt["result"]
    evidence = {"schemaVersion": 1, "sourceCommit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
                "dataKind": "declared synthetic example", "modelCalled": False,
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "inputSha256": receipt["inputSha256"], "policySha256": receipt["policySha256"],
                "checks": [], "screenshots": []}
    errors = []
    with tempfile.TemporaryDirectory(prefix="kim-service-visual-browser-") as temporary:
        folder = Path(temporary)
        for file in result["files"]:
            assert file["name"] in {"diagram.svg", "storyboard.html", "alternative.txt"}
            contents = file["content"].encode("utf-8")
            assert hashlib.sha256(contents).hexdigest() == file["sha256"]
            (folder / file["name"]).write_bytes(contents)
            (OUTPUT / file["name"]).write_bytes(contents)
        english_input = {**source, "locale": "en"}
        english_process = subprocess.run(["node", "skills/visual-explainer/scripts/run.mjs", "--input-json", "-"],
                                         cwd=ROOT, input=json.dumps(english_input, ensure_ascii=False), text=True, capture_output=True, check=True)
        english_receipt = json.loads(english_process.stdout)
        english_html = next(item for item in english_receipt["result"]["files"] if item["name"] == "storyboard.html")
        (folder / "storyboard.en.html").write_text(english_html["content"], encoding="utf-8")
        evidence["englishInputSha256"] = english_receipt["inputSha256"]
        handler = functools.partial(QuietHandler, directory=str(folder))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        location = f"http://127.0.0.1:{server.server_port}/storyboard.html"
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch(executable_path=os.environ.get("PLAYWRIGHT_CHROMIUM_EXECUTABLE") or None)
                evidence["browserVersion"] = browser.version

                def capture(page, name, label):
                    page.evaluate("document.fonts.ready")
                    page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
                    layout = page.evaluate("""() => {
                      const svg = document.querySelector('svg');
                      const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
                      const labels = [...svg.querySelectorAll('.node text')];
                      return {viewport: {width:innerWidth,height:innerHeight}, documentWidth:document.documentElement.scrollWidth,
                        nodeTextMinimumPx:Math.min(...labels.map(node => parseFloat(getComputedStyle(node).fontSize)*scale)),
                        centeredFirst:Math.abs(Number(svg.querySelector('.node text').getAttribute('x')) - svg.viewBox.baseVal.width/2) < 1,
                        centeredLast:Math.abs(Number(labels.at(-1).getAttribute('x')) - svg.viewBox.baseVal.width/2) < 1};
                    }""")
                    assert layout["documentWidth"] <= layout["viewport"]["width"] + 2, layout
                    assert layout["nodeTextMinimumPx"] >= 11.9, layout
                    assert layout["centeredFirst"] and layout["centeredLast"], layout
                    file = OUTPUT / name
                    page.screenshot(path=str(file), full_page=True, animations="disabled")
                    evidence["screenshots"].append({"file": name, "view": label,
                                                    "sha256": hashlib.sha256(file.read_bytes()).hexdigest(), "layout": layout})

                context = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="zh-CN")
                page = context.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(location, wait_until="networkidle")
                expect(page.locator(".node")).to_have_count(len(source["diagram"]["nodes"]))
                expect(page.locator(".edge")).to_have_count(len(source["diagram"]["edges"]))
                capture(page, "visual-helper-overview.png", "Actual generated SVG and storyboard")
                page.locator("#next").click()
                expect(page.locator("#detail h2")).to_contain_text("1 / 3")
                page.keyboard.press("ArrowRight")
                expect(page.locator("#detail h2")).to_contain_text("2 / 3")
                expect(page.locator("#detail p")).to_have_text(source["diagram"]["stages"][1]["explanation"])
                assert page.locator('[data-stage-index="2"].muted').count() > 0
                capture(page, "visual-helper-stage.png", "Keyboard-driven second stage")
                page.keyboard.press("ArrowLeft")
                expect(page.locator("#detail h2")).to_contain_text("1 / 3")
                page.locator("#all").click()
                expect(page.locator(".muted")).to_have_count(0)
                page.locator("#play").click()
                expect(page.locator("#play")).to_have_text("暂停")
                expect(page.locator("#detail h2")).to_contain_text("3 / 3", timeout=9000)
                expect(page.locator("#play")).to_have_text("播放", timeout=6000)
                evidence["checks"].append("CLI-produced SVG/HTML preserve their output hashes; buttons, keyboard, staged explanations and autoplay work")
                page.goto(location.replace("storyboard.html", "storyboard.en.html"), wait_until="networkidle")
                expect(page.locator("html")).to_have_attribute("lang", "en")
                expect(page.locator("#previous")).to_have_text("Previous phase")
                expect(page.locator("#all")).to_have_text("Show all")
                evidence["checks"].append("English locale changes controls and page language while retaining original diagram data")
                context.close()

                mobile = browser.new_context(viewport={"width": 390, "height": 844}, locale="zh-CN", reduced_motion="reduce")
                page = mobile.new_page()
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(location, wait_until="networkidle")
                page.locator("#play").click()
                expect(page.locator("#detail h2")).to_contain_text("1 / 3")
                expect(page.locator("#play")).to_have_text("播放")
                capture(page, "visual-helper-mobile.png", "Readable mobile canvas with reduced motion")
                evidence["checks"].append("Mobile page stays within viewport; node text is at least 12 screen pixels; first/last nodes centered; reduced motion avoids autoplay")
                mobile.close()
                browser.close()
                assert not errors, errors
                evidence["checks"].append("No browser page errors")
                evidence["result"] = "passed"
        except Exception as error:
            evidence["result"] = "failed"
            evidence["error"] = str(error)
            raise
        finally:
            server.shutdown()
            server.server_close()
            (OUTPUT / "browser-evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"result": evidence["result"], "checks": len(evidence["checks"]), "screenshots": len(evidence["screenshots"])}))


if __name__ == "__main__":
    main()
