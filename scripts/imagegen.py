#!/usr/bin/env python3
"""
สร้างภาพด้วย AI ผ่าน OpenRouter Image API (key เดียวกับ TTS) — projects/<slug>/images.json → public/<slug>/img/

  python scripts/imagegen.py <slug>                    # สร้างผู้สมัครของทุกรูปที่ยังไม่มี
  python scripts/imagegen.py <slug> --only clay-buddy-sheet earth-plate
  python scripts/imagegen.py <slug> --only earth-plate --force     # สร้างใหม่ (ไม่ใช้ cache)
  python scripts/imagegen.py <slug> --select earth-plate=2          # เลือกผู้สมัครที่ 2 เป็นรูปจริง
  python scripts/imagegen.py <slug> --dry-run                       # ดู prompt ที่จะส่ง ไม่เสียเงิน
  python scripts/imagegen.py --models                               # รายชื่อโมเดลภาพบน OpenRouter

images.json:
  {"images": [{"id": "earth-plate", "kind": "plate|cutout", "aspect": "16:9", "prompt": "...",
               "refs": ["clay-buddy-sheet"], "variants": 2, "model": "(ไม่บังคับ)"}]}
ผลลัพธ์: public/<slug>/img/_cand/<id>-<k>.png (ผู้สมัคร) · public/<slug>/img/<id>.png (ที่เลือก)
บันทึก: projects/<slug>/images.lock.json (model, prompt, ค่าใช้จ่าย) — ใช้ใน assets.md (license) และ render
"""
from __future__ import annotations
import argparse, base64, hashlib, json, os, re, shutil, subprocess, sys, time, urllib.error, urllib.request

# Windows (โลแคลไทย = cp874): บังคับ stdout/stderr เป็น UTF-8 กัน UnicodeEncodeError ตอนพิมพ์ ✓ ⚠ ¶ ฯลฯ
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from datetime import datetime, timezone
from pathlib import Path

API = os.environ.get("OPENROUTER_IMAGES_URL", "https://openrouter.ai/api/v1/images")
NO_TEXT = "No text, no letters, no numbers, no captions, no watermark, no logo, no signature."
CHROMA = "Isolated single subject centered on a perfectly flat pure green (#00FF00) background, no shadow on the background, nothing else in the frame."
PLATE = "Full-bleed background scene with empty space in the middle for overlays, no main character."
ERA_HINT = {
    "prehistoric": "primordial landscape feel, earthy ochre and burnt-orange tones",
    "ancient": "ancient Near East feel, sand, clay and gold tones",
    "medieval": "medieval manuscript feel, deep brown, vermilion and gold tones",
    "early-modern": "17th-century engraving feel, sepia tones",
    "1800s": "19th-century engraving feel, sepia tones",
    "present": "",
    "future": "futuristic glow, violet and cyan tones",
}
REPO = Path(__file__).resolve().parent.parent


def load_env():
    f = REPO / ".env"
    if f.exists():
        for line in f.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def settings_of(slug: str) -> dict:
    out = subprocess.run(["node", str(REPO / "scripts/lib/settings.mjs"), slug, "--json"], cwd=REPO, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
    if out.returncode != 0:
        sys.exit(f"settings ผิดพลาด: {out.stderr.strip() or out.stdout.strip()}")
    return json.loads(out.stdout)


def http(method: str, url: str, key: str, body: dict | None = None, timeout=300):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, method=method,
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "HTTP-Referer": "https://github.com/kimookpong/storyteller-with-claude", "X-Title": "storyteller-with-claude"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read()[:600].decode("utf-8", "replace")
            if e.code in (429, 502, 503) and attempt < 3:
                time.sleep(2 ** attempt * 3)
                continue
            raise RuntimeError(f"HTTP {e.code} {({401: 'API key ผิด', 402: 'เครดิต OpenRouter ไม่พอ', 404: 'ไม่พบโมเดล (ดู --models)'}).get(e.code, '')}: {msg}") from None
    raise RuntimeError("เรียก API ไม่สำเร็จ")


def has_alpha(png: Path) -> bool:
    b = png.read_bytes()[:32]
    return b[:4] == b"\x89PNG" and b[25] in (4, 6)


def chroma_key(src: Path, dst: Path):
    """ลบพื้นเขียว #00FF00 → PNG โปร่งใส (ffmpeg colorkey)"""
    try:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", "colorkey=0x00FF00:0.32:0.08,despill=type=green,format=rgba", str(dst)], check=True, capture_output=True)
    except FileNotFoundError:
        sys.exit("ต้องมี ffmpeg เพื่อลบพื้นเขียว (brew install ffmpeg)")
    except subprocess.CalledProcessError as e:
        print(f"   ⚠ ลบพื้นไม่สำเร็จ: {e.stderr.decode(errors='replace')[:200]} — ใช้ภาพเดิม")
        shutil.copyfile(src, dst)


def data_url(p: Path) -> str:
    mt = "image/png" if p.suffix == ".png" else "image/jpeg"
    return f"data:{mt};base64,{base64.b64encode(p.read_bytes()).decode()}"


def main():
    ap = argparse.ArgumentParser(description="AI image generation (OpenRouter) สำหรับ images.json")
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--only", nargs="*", default=[])
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--select", action="append", default=[], metavar="ID=K")
    ap.add_argument("--variants", type=int, help="จำนวนผู้สมัครต่อรูป (ทับค่าใน images.json)")
    ap.add_argument("--max-cost", type=float, default=float(os.environ.get("IMAGE_MAX_COST", "10")), help="หยุดเมื่อค่าใช้จ่ายรอบนี้เกิน (USD)")
    ap.add_argument("--models", action="store_true")
    a = ap.parse_args()
    load_env()
    key = os.environ.get("OPENROUTER_API_KEY")

    if a.models:
        if not key:
            sys.exit("ต้องตั้ง OPENROUTER_API_KEY ใน .env ก่อน")
        data = http("GET", API + "/models", key)
        for m in data.get("data", data if isinstance(data, list) else []):
            print(f"{m.get('id')}  {json.dumps({k: v for k, v in m.items() if k not in ('id', 'description')}, ensure_ascii=False)[:220]}")
        return
    if not a.slug or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", a.slug):
        ap.error("ต้องระบุ slug")

    pdir = REPO / "projects" / a.slug
    spec_f, lock_f = pdir / "images.json", pdir / "images.lock.json"
    if not spec_f.exists():
        sys.exit(f"ไม่มี {spec_f.relative_to(REPO)} — Claude สร้างจาก assets.md ใน stage 6 (rule 04)")
    spec = json.loads(spec_f.read_text(encoding="utf-8"))
    lock = json.loads(lock_f.read_text(encoding="utf-8")) if lock_f.exists() else {"selected": {}, "candidates": {}, "cost": 0}
    out_dir = REPO / "public" / a.slug / "img"
    cand_dir = out_dir / "_cand"
    now = lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")
    save_lock = lambda: lock_f.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    by_id = {x["id"]: x for x in spec.get("images", [])}

    # ---- เลือกผู้สมัคร ----
    if a.select:
        for s in a.select:
            iid, _, k = s.partition("=")
            c = next((c for c in lock["candidates"].get(iid, []) if str(c["k"]) == k), None)
            if not c:
                sys.exit(f"ไม่พบผู้สมัคร {iid} #{k}")
            out_dir.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(REPO / c["file"], out_dir / f"{iid}.png")
            lock["selected"][iid] = {**c, "selectedAt": now(), "kind": by_id.get(iid, {}).get("kind", "cutout")}
            print(f"✓ เลือก {iid} = #{k} → public/{a.slug}/img/{iid}.png")
        save_lock()
        return

    st = settings_of(a.slug)
    style = st["resolved"]["style"]
    img_cfg = style.get("image") or {}
    style_prompt = img_cfg.get("prompt", "")
    portrait = st["resolved"]["format"]["height"] > st["resolved"]["format"]["width"]
    shots = json.loads((pdir / "shots.json").read_text(encoding="utf-8")) if (pdir / "shots.json").exists() else {"scenes": []}
    era_of = {}
    for sc in shots.get("scenes", []):
        for sh in sc["shots"]:
            for l in sh["layers"]:
                if l["asset"].startswith("img:"):
                    era_of.setdefault(l["asset"][4:].split("|")[0], sc["era"])

    todo = [x for x in spec.get("images", []) if not a.only or x["id"] in a.only]
    if a.only and len(todo) != len(a.only):
        sys.exit(f"ไม่พบ id: {set(a.only) - {x['id'] for x in todo}}")
    if not a.dry_run and not key:
        sys.exit("ต้องตั้ง OPENROUTER_API_KEY ใน .env ก่อน")
    spent = 0.0
    for im in todo:
        iid, kind = im["id"], im.get("kind", "cutout")
        cutout = kind == "cutout"
        method = im.get("cutout", img_cfg.get("cutout", "chroma"))
        model = im.get("model") or (img_cfg.get("cutoutModel") if cutout else None) or spec.get("model") or img_cfg.get("model", "google/gemini-2.5-flash-image")
        aspect = im.get("aspect") or ("9:16" if portrait and not cutout else "16:9" if not cutout else "1:1")
        era = im.get("era") or era_of.get(iid, "")
        parts = [style_prompt, ERA_HINT.get(era, ""), im["prompt"], PLATE if kind == "plate" else "", CHROMA if cutout and method == "chroma" else "", NO_TEXT]
        prompt = " ".join(p.strip().rstrip(".") + "." for p in parts if p and p.strip())
        refs = []
        for rid in im.get("refs", []):
            rp = out_dir / f"{rid}.png"
            if not rp.exists():
                print(f"⚠ {iid}: ยังไม่ได้เลือกรูปอ้างอิง {rid} — สร้าง/เลือก {rid} ก่อน (ข้ามรูปนี้)")
                refs = None
                break
            refs.append(rp)
        if refs is None:
            continue
        n = a.variants or im.get("variants") or 2
        ref_hash = "".join(hashlib.sha1(r.read_bytes()).hexdigest()[:8] for r in refs)
        base_key = hashlib.sha1("|".join([model, prompt, aspect, kind, method, ref_hash]).encode()).hexdigest()[:12]
        have = [c for c in lock["candidates"].get(iid, []) if c.get("key") == base_key]
        if a.dry_run:
            print(f"--- {iid} ({kind}, {aspect}, {model}, ×{n}{', refs ' + ','.join(im.get('refs', [])) if refs else ''}) {'[มีแล้ว ' + str(len(have)) + ']' if have else ''}\n{prompt}\n")
            continue
        if have and not a.force:
            print(f"· {iid}: มีผู้สมัครจาก prompt นี้แล้ว {len(have)} รูป (ใช้ --force เพื่อสร้างใหม่)")
            continue
        if spent >= a.max_cost:
            print(f"⚠ หยุด: ค่าใช้จ่ายรอบนี้ ${spent:.2f} ถึงเพดาน --max-cost ${a.max_cost:.2f}")
            break
        body = {"model": model, "prompt": prompt, "n": n, "aspect_ratio": aspect, "output_format": "png"}
        if cutout and method == "native":
            body["background"] = "transparent"
        if refs:
            body["input_references"] = [{"type": "image_url", "image_url": {"url": data_url(r)}} for r in refs]
        print(f"→ {iid}  {model}  {aspect}  ×{n}")
        try:
            res = http("POST", API, key, body)
        except RuntimeError as e:
            if "HTTP 400" in str(e) and ("background" in body or "n" in body):
                print(f"   … โมเดลไม่รับบางพารามิเตอร์ — ลองแบบพื้นฐาน ({str(e)[:120]})")
                body.pop("background", None)
                res = None
                imgs_all, cost_all = [], 0.0
                for _ in range(n):
                    b1 = {k: v for k, v in body.items() if k != "n"}
                    r1 = http("POST", API, key, b1)
                    imgs_all += r1.get("data", [])
                    cost_all += float((r1.get("usage") or {}).get("cost") or 0)
                res = {"data": imgs_all, "usage": {"cost": cost_all}}
            else:
                print(f"   ✗ {e}")
                continue
        cost = float((res.get("usage") or {}).get("cost") or 0)
        spent += cost
        lock["cost"] = round(float(lock.get("cost", 0)) + cost, 4)
        cand_dir.mkdir(parents=True, exist_ok=True)
        cands = [c for c in lock["candidates"].get(iid, []) if a.force is False or c.get("key") != base_key]
        start = max([c["k"] for c in cands], default=0)
        for j, d in enumerate(res.get("data", []), start=1):
            raw = base64.b64decode(d.get("b64_json") or "")
            if not raw:
                continue
            k = start + j
            f = cand_dir / f"{iid}-{k}.png"
            if cutout and raw[:4] == b"\x89PNG" and raw[25] not in (4, 6):
                # ไม่มี alpha → ลบพื้นเขียว (ไฟล์ดิบเก็บใน temp ของระบบ ไม่ทิ้งไว้ใน public/)
                import tempfile
                with tempfile.TemporaryDirectory() as td:
                    tmp = Path(td) / "raw.png"
                    tmp.write_bytes(raw)
                    chroma_key(tmp, f)
            elif cutout and raw[:4] != b"\x89PNG":
                import tempfile
                with tempfile.TemporaryDirectory() as td:
                    tmp = Path(td) / "raw.img"
                    tmp.write_bytes(raw)
                    chroma_key(tmp, f)
            else:
                f.write_bytes(raw)
            cands.append({"k": k, "file": str(f.relative_to(REPO)), "key": base_key, "model": model, "prompt": prompt,
                          "aspect": aspect, "cost": round(cost / max(1, len(res["data"])), 4), "at": now()})
        lock["candidates"][iid] = cands
        save_lock()
        print(f"   ✓ {len(res.get('data', []))} รูป · ${cost:.3f}  → public/{a.slug}/img/_cand/{iid}-*.png")
    if not a.dry_run:
        print(f"\nรวมรอบนี้ ${spent:.3f} · ทั้งโปรเจกต์ ${lock.get('cost', 0):.3f} — เลือกรูปในหน้า Asset list (HistoryTeller) หรือ --select id=k")


if __name__ == "__main__":
    main()
