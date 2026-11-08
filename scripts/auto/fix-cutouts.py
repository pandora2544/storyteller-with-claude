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


def flood(im, box):
    """ลบพื้นสีเรียบที่ติดขอบของกรอบ box=(x0,y0,x1,y1) — คืนชื่อสีที่ลบ หรือ None"""
    x0, y0, x1, y1 = box
    w, h = im.size
    px = im.load()
    edge = [(x, y) for x, y in border_pixels(x1 - x0, y1 - y0, 2)]
    edge = [(x + x0, y + y0) for x, y in edge]
    cols = [px[x, y] for x, y in edge if px[x, y][3] > 200]
    if len(cols) < len(edge) * 0.5:
        return None
    bg = tuple(sorted(c[i] for c in cols)[len(cols) // 2] for i in range(3))
    near = lambda p: p[3] > 0 and ((p[0] - bg[0]) ** 2 + (p[1] - bg[1]) ** 2 + (p[2] - bg[2]) ** 2) ** 0.5 <= TOL
    if sum(1 for c in cols if near(c)) < len(cols) * 0.6:
        return None
    alpha = im.getchannel("A")
    a = alpha.load()
    seen = bytearray(w * h)
    q = deque()
    for x, y in border_pixels(x1 - x0, y1 - y0, 1):
        x, y = x + x0, y + y0
        if near(px[x, y]) and not seen[y * w + x]:
            seen[y * w + x] = 1
            q.append((x, y))
    while q:
        x, y = q.popleft()
        a[x, y] = 0
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if x0 <= nx < x1 and y0 <= ny < y1 and not seen[ny * w + nx]:
                seen[ny * w + nx] = 1
                if near(px[nx, ny]):
                    q.append((nx, ny))
    im.putalpha(alpha)
    return bg


def fix(path: Path) -> str:
    im = Image.open(path).convert("RGBA")
    done = []
    box = (0, 0) + im.size
    for _ in range(3):  # รูปบางรูปมี "แผ่นพื้น" ซ้อนอยู่ในกรอบสีพื้นอีกชั้น → ลบซ้ำในกรอบที่เหลือ
        bg = flood(im, box)
        if bg is None:
            break
        done.append(bg)
        bb = im.getchannel("A").point(lambda v: 255 if v > 0 else 0).getbbox()
        if not bb or (bb[2] - bb[0]) < 16 or (bb[3] - bb[1]) < 16:
            break
        box = bb
    if not done:
        return "ไม่มีพื้นสีเรียบ/โปร่งใสอยู่แล้ว — ข้าม"
    alpha = im.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    im.putalpha(alpha)
    im.save(path)
    return "ลบพื้น " + " → ".join(map(str, done))


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
