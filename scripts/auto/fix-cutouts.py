#!/usr/bin/env python3
"""ลบพื้นหลังของรูป cutout ที่โมเดลส่งมาเป็นพื้นสีเรียบ (เทา/ขาว/เขียว) แต่ไม่มี alpha

  python scripts/auto/fix-cutouts.py <slug>

วิธี: อ่านสีพื้นจากขอบรูป → flood fill จากขอบด้วยค่าความต่างสี → ทำให้โปร่งใส + ขอบนุ่ม
แก้เฉพาะรูป kind=cutout ที่เลือกแล้ว (public/<slug>/img/<id>.png) และขอบรูปยังทึบอยู่
ต้องมี Pillow (pip install pillow)
"""
import json, sys
from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter

REPO = Path(__file__).resolve().parent.parent.parent
TOL = 38  # ความต่างสีสูงสุดจากสีพื้น (0–441)


def border_pixels(w, h, step=4):
    for x in range(0, w, step):
        yield x, 0
        yield x, h - 1
    for y in range(0, h, step):
        yield 0, y
        yield w - 1, y


def fix(path: Path) -> str:
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    edge = [px[x, y] for x, y in border_pixels(w, h)]
    if sum(1 for p in edge if p[3] < 20) > len(edge) * 0.5:
        return "โปร่งใสอยู่แล้ว"
    # สีพื้น = ค่ากลางของขอบ
    bg = tuple(sorted(p[i] for p in edge)[len(edge) // 2] for i in range(3))
    near = lambda p: ((p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2) ** 0.5 <= TOL
    if sum(1 for p in edge if near(p)) < len(edge) * 0.6:
        return "ขอบไม่ใช่สีเรียบ — ข้าม"
    mask = Image.new("L", (w, h), 255)
    m = mask.load()
    seen = bytearray(w * h)
    q = deque((x, y) for x, y in border_pixels(w, h, 1) if near(px[x, y]))
    for x, y in q:
        seen[y * w + x] = 1
    while q:
        x, y = q.popleft()
        m[x, y] = 0
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                seen[ny * w + nx] = 1
                if near(px[nx, ny]):
                    q.append((nx, ny))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(mask)
    im.save(path)
    return f"ลบพื้น {bg}"


def main():
    if len(sys.argv) < 2:
        sys.exit("ใช้: python scripts/auto/fix-cutouts.py <slug>")
    slug = sys.argv[1]
    lock_f = REPO / "projects" / slug / "images.lock.json"
    if not lock_f.exists():
        print("ไม่มี images.lock.json — ข้าม")
        return
    sel = json.loads(lock_f.read_text(encoding="utf-8")).get("selected", {})
    for iid, s in sel.items():
        if s.get("kind") != "cutout":
            continue
        f = REPO / "public" / slug / "img" / f"{iid}.png"
        if f.exists():
            print(f"{iid}: {fix(f)}")


if __name__ == "__main__":
    main()
