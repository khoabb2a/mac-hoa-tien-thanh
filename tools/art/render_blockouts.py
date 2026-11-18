"""Chụp ảnh khối thô cho pipeline AI.

Cần: dev server đang chạy (`npm run dev`), Python + playwright (`pip install playwright && playwright install chromium`).
Chạy:  python tools/art/render_blockouts.py [http://localhost:5173]
Ra:    art/blockout/<loai>_line.png, art/blockout/<loai>_shade.png
"""
import asyncio
import os
import sys

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5173"
TYPES = ["chinhDien", "tinhXa", "tuLinhTran", "duocVien"]
MODES = ["line", "shade"]
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "art", "blockout")


async def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        exe = os.environ.get("CHROME_PATH")
        browser = await p.chromium.launch(
            executable_path=exe,
            args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        )
        page = await browser.new_page(viewport={"width": 1024, "height": 1024}, device_scale_factor=1)
        for t in TYPES:
            for m in MODES:
                await page.goto(f"{BASE}/tools/art/blockout.html?b={t}&mode={m}")
                await page.wait_for_selector("body[data-ready='1']", timeout=20000)
                path = os.path.join(OUT, f"{t}_{m}.png")
                await page.locator("#c").screenshot(path=path)
                print("saved", os.path.normpath(path))
        await browser.close()


asyncio.run(main())
