#!/usr/bin/env python3
"""
TTS ผ่าน OpenRouter (Google Gemini TTS) — อ่าน shots.json แล้วสร้างเสียงพากย์ทีละ scene

OpenRouter /audio/speech ไม่ส่ง word timestamp กลับมา สคริปต์นี้จึงสังเคราะห์เสียง "ทีละช่วง"
ตาม cue marker [#shotId] แล้วต่อกันเอง → ได้เวลาตัดช็อตที่แม่นยำ (รู้ความยาวแต่ละช่วงจากไฟล์ PCM)

Output ต่อ scene (ใน public/<slug>/vo/):
  S01.wav   เสียงพากย์ (PCM 16-bit mono)
  S01.json  { durationMs, cues: {"S01-02": ms, ...}, segments: [...] }
  .cache/   PCM ของแต่ละช่วง (รันซ้ำจะไม่เสียเงินกับช่วงที่ไม่ได้แก้)

ใช้:
  python scripts/tts.py projects/<slug>/shots.json              # ทุก scene
  python scripts/tts.py projects/<slug>/shots.json --scene S03  # เฉพาะ scene
  python scripts/tts.py projects/<slug>/shots.json --dry-run    # ดูข้อความที่จะส่ง ไม่เรียก API
  python scripts/tts.py --audition                              # ลองเสียงหลายตัวกับประโยคเดียวกัน

ตั้งค่าใน .env:
  OPENROUTER_API_KEY=sk-or-...
  (ค่า TTS ต่อโปรเจกต์มาจาก projects/<slug>/settings.json → presets/voices/<id>.json ซึ่งชนะ .env)
  TTS_MODEL=google/gemini-3.8-flash-tts
  TTS_VOICE=Umbriel
"""
from __future__ import annotations  # Python 3.9 (macOS) รองรับ "str | None"
import argparse, hashlib, json, os, re, struct, sys, time, urllib.error, urllib.request, wave

# Windows (โลแคลไทย = cp874): บังคับ stdout/stderr เป็น UTF-8 กัน UnicodeEncodeError ตอนพิมพ์ ✓ ⚠ ¶ ฯลฯ
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
from pathlib import Path

API_URL = "https://openrouter.ai/api/v1/audio/speech"  # override ได้ด้วย OPENROUTER_TTS_URL
DEFAULTS = {
    "TTS_MODEL": "google/gemini-3.8-flash-tts",
    "TTS_VOICE": "Umbriel",  # ชาย โทน easy-going — ลองตัวอื่นด้วย --audition
    # rule 03: เพื่อนเล่าให้เพื่อนฟัง ผู้ชาย เป็นมิตร ง่วง ๆ นิดนึง
    "TTS_STYLE": (
        "Thai male narrator talking casually to a close friend late at night: warm, friendly, "
        "relaxed and a little sleepy, unhurried pace with soft trailing endings, slight smile in the voice. "
        "Not formal, not a news reader. Gentle excitement only on surprising facts."
    ),
    "TTS_PCM_RATE": "24000",  # Gemini TTS: PCM 24 kHz / 16-bit / mono
    "TTS_GAP_MS": "140",      # ช่องว่างระหว่างช่วง (หลังตัดเงียบหัวท้าย)
    "TTS_PARA_GAP_MS": "800", # บรรทัดว่างในบท = หยุดยาวก่อน reveal (rule 03)
    "TTS_TRIM_KEEP_MS": "40", # เงียบที่เก็บไว้หัว/ท้ายแต่ละช่วง (เสียงเร็วใช้ ~15)
    "TTS_TEMPO": "1.0",       # เร่งทั้งซีนด้วย ffmpeg atempo หลังต่อเสียง (สไตล์ ไม่ใช่ทางแก้บทยาว)
}
AUDITION_VOICES = ["Umbriel", "Achird", "Enceladus", "Iapetus", "Zubenelgenubi", "Charon", "Algenib", "Sadachbia"]
AUDITION_TEXT = "เช้านี้กินกาแฟกันยัง… รู้ปะ ทั้งโลกดื่มกาแฟกันวันละกว่าสองพันล้านแก้วเลยนะ"
CUE_RE = re.compile(r"\[#([A-Za-z0-9_-]+)\]")
CACHE_VERSION = "1"


SETTINGS = {}  # ค่าจาก projects/<slug>/settings.json (voice preset) — ชนะ .env


def cfg(key):
    return SETTINGS.get(key) or os.environ.get(key) or DEFAULTS[key]


def load_project_settings(repo: Path, slug: str | None, preset: str | None = None):
    """อ่าน settings ผ่าน scripts/lib/settings.mjs (ต้นฉบับเดียวของตัวเลข) → ตั้งค่า TTS จาก voice preset"""
    import subprocess
    args = ["node", str(repo / "scripts" / "lib" / "settings.mjs")] + ([slug] if slug else []) + (["--voice", preset] if preset else []) + ["--json"]
    try:
        out = subprocess.run(args, cwd=repo, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=30)
    except FileNotFoundError:
        print("⚠ ไม่พบ node — ใช้ค่า TTS จาก .env/ค่าเริ่มต้น")
        return None
    if out.returncode != 0:
        sys.exit(f"settings ผิดพลาด: {out.stderr.strip() or out.stdout.strip()}")
    data = json.loads(out.stdout)
    t = data["resolved"]["voice"]["tts"]
    SETTINGS.update({"TTS_MODEL": t.get("model"), "TTS_VOICE": t.get("voice"), "TTS_STYLE": t.get("style"),
                     "TTS_GAP_MS": str(t["gapMs"]) if t.get("gapMs") is not None else None,
                     "TTS_PARA_GAP_MS": str(t["paraGapMs"]) if t.get("paraGapMs") is not None else None,
                     "TTS_TRIM_KEEP_MS": str(t["trimKeepMs"]) if t.get("trimKeepMs") is not None else None,
                     "TTS_TEMPO": str(t["tempo"]) if t.get("tempo") is not None else None})
    for k in [k for k, v in SETTINGS.items() if not v]:
        del SETTINGS[k]
    return data


def load_env(path: Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# ---------------- API ----------------
def synth_pcm(text: str, key: str, model: str, voice: str, style: str) -> tuple[bytes, int]:
    body = {
        "model": model,
        "input": text,
        "voice": voice,
        "response_format": "pcm",
        "provider": {"options": {
            "google-ai-studio": {"speech_metadata": {"style": style}},
            "google-vertex": {"speech_metadata": {"style": style}},
        }},
    }
    req = urllib.request.Request(
        os.environ.get("OPENROUTER_TTS_URL", API_URL), data=json.dumps(body).encode("utf-8"), method="POST",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "HTTP-Referer": "https://github.com/kimookpong/storyteller-with-claude", "X-Title": "storyteller-with-claude"},
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
                ctype = r.headers.get("Content-Type", "")
                m = re.search(r"rate=(\d+)", ctype)
                rate = int(m.group(1)) if m else int(cfg("TTS_PCM_RATE"))
                if "json" in ctype:
                    raise RuntimeError(f"ได้ JSON แทนเสียง: {data[:300]!r}")
                if len(data) % 2:
                    data = data[:-1]
                return data, rate
        except urllib.error.HTTPError as e:
            msg = e.read()[:400].decode("utf-8", "replace")
            if e.code in (429, 502, 503) and attempt < 4:
                wait = 2 ** attempt * 2
                print(f"   … {e.code} รอ {wait}s แล้วลองใหม่")
                time.sleep(wait)
                continue
            hint = {401: "API key ผิด", 402: "เครดิต OpenRouter ไม่พอ", 404: "ไม่พบ model — เช็ก TTS_MODEL"}.get(e.code, "")
            raise RuntimeError(f"HTTP {e.code} {hint}: {msg}") from None
    raise RuntimeError("เรียก API ไม่สำเร็จ")


# ---------------- PCM utils ----------------
def samples(pcm: bytes):
    return struct.unpack(f"<{len(pcm)//2}h", pcm)


def trim_silence(pcm: bytes, rate: int, thresh=500, keep_ms=40) -> bytes:
    s = samples(pcm)
    if not s:
        return pcm
    win = max(1, rate // 100)  # 10ms
    def loud(i):
        return max(abs(x) for x in s[i:i + win]) > thresh
    start = 0
    while start < len(s) and not loud(start):
        start += win
    end = len(s)
    while end > start and not loud(max(start, end - win)):
        end -= win
    keep = rate * keep_ms // 1000
    start = max(0, start - keep)
    end = min(len(s), end + keep)
    return pcm[start * 2:end * 2]


def apply_tempo(pcm: bytes, rate: int, tempo: float) -> bytes:
    """เร่ง/ชะลอโดยไม่เปลี่ยนระดับเสียง (ffmpeg atempo) — PCM 16-bit mono เข้า-ออก"""
    if abs(tempo - 1.0) < 0.005 or not pcm:
        return pcm
    if not (0.8 <= tempo <= 1.3):
        sys.exit(f"tts.tempo {tempo} นอกช่วง 0.8–1.3")
    import subprocess
    try:
        out = subprocess.run(["ffmpeg", "-v", "error", "-f", "s16le", "-ar", str(rate), "-ac", "1", "-i", "pipe:0",
                              "-filter:a", f"atempo={tempo}", "-f", "s16le", "-ar", str(rate), "-ac", "1", "pipe:1"],
                             input=pcm, capture_output=True, check=True)
    except FileNotFoundError:
        sys.exit("ต้องมี ffmpeg เพื่อใช้ tts.tempo (brew install ffmpeg)")
    except subprocess.CalledProcessError as e:
        sys.exit(f"ffmpeg atempo ผิดพลาด: {e.stderr.decode(errors='replace')[:300]}")
    return out.stdout[: len(out.stdout) // 2 * 2]


def silence(ms: int, rate: int) -> bytes:
    return b"\x00\x00" * (rate * ms // 1000)


def ms_of(pcm: bytes, rate: int) -> int:
    return round(len(pcm) / 2 / rate * 1000)


def write_wav(path: Path, pcm: bytes, rate: int):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)


# ---------------- script → segments ----------------
def segments_of(scene: dict):
    """แบ่ง voTTS ตาม cue marker และบรรทัดว่าง → [(cueId|None, text, paraBreakBefore)]
    ช่วงแรกของ scene ผูกกับช็อตแรก (cue=None เพราะเริ่มที่ 0 อยู่แล้ว)"""
    text = scene.get("voTTS") or scene["vo"]
    out = []
    paras = [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]
    for pi, para in enumerate(paras):
        toks = CUE_RE.split(para)
        pending_para = pi > 0
        head = " ".join(toks[0].split())
        if head:
            out.append((None, head, pending_para))
            pending_para = False
        for j in range(1, len(toks), 2):
            out.append((toks[j], " ".join(toks[j + 1].split()), pending_para))
            pending_para = False
    return out


def seg_key(text, model, voice, style):
    return hashlib.sha1("|".join([CACHE_VERSION, model, voice, style, text]).encode("utf-8")).hexdigest()[:16]


def build_scene(scene, out_dir: Path, key, model, voice, style, dry, force):
    segs = segments_of(scene)
    if dry:
        print(f"--- {scene['id']} ({len(segs)} ช่วง) ---")
        for cue, t, para in segs:
            print(f"  {'¶ ' if para else ''}[{cue or '…'}] {t}")
        return None
    cache = out_dir / ".cache"
    cache.mkdir(parents=True, exist_ok=True)
    gap, para_gap = int(cfg("TTS_GAP_MS")), int(cfg("TTS_PARA_GAP_MS"))
    keep, tempo = int(cfg("TTS_TRIM_KEEP_MS")), float(cfg("TTS_TEMPO"))
    pcm_all, rate, cues, meta = b"", None, {}, []
    for i, (cue, text, para) in enumerate(segs):
        if not text:
            if cue:
                cues[cue] = ms_of(pcm_all, rate or int(cfg("TTS_PCM_RATE")))
            continue
        k = seg_key(text, model, voice, style)
        f = cache / f"{k}.pcm"
        rf = cache / f"{k}.rate"
        if f.exists() and not force:
            pcm, r = f.read_bytes(), int(rf.read_text())
            src = "cache"
        else:
            pcm, r = synth_pcm(text, key, model, voice, style)
            f.write_bytes(pcm)
            rf.write_text(str(r))
            src = "api"
        if rate is None:
            rate = r
        elif r != rate:
            raise RuntimeError(f"sample rate ไม่ตรงกัน ({r} vs {rate})")
        pcm = trim_silence(pcm, rate, keep_ms=keep)
        if i > 0:
            pcm_all += silence(para_gap if para else gap, rate)
        if cue:
            cues[cue] = ms_of(pcm_all, rate)
        meta.append({"cue": cue, "startMs": ms_of(pcm_all, rate), "durationMs": ms_of(pcm, rate), "text": text, "source": src})
        pcm_all += pcm
        # ตรวจความสมเหตุสมผล: ~6–20 ตัวอักษร/วินาที ถ้าผิดมาก น่าจะตั้ง TTS_PCM_RATE ผิด
        cps = len(re.sub(r"\s|…", "", text)) / max(0.05, ms_of(pcm, rate) / 1000)
        if len(text) > 15 and not (4 <= cps <= 25):
            print(f"   ⚠ {scene['id']} ช่วง {cue or 'แรก'}: {cps:.1f} ตัวอักษร/วินาที (ผิดปกติ — เช็ก TTS_PCM_RATE)")
    if abs(tempo - 1.0) >= 0.005:
        pcm_all = apply_tempo(pcm_all, rate, tempo)
        cues = {k: round(v / tempo) for k, v in cues.items()}
        for m in meta:
            m["startMs"], m["durationMs"] = round(m["startMs"] / tempo), round(m["durationMs"] / tempo)
    wav = out_dir / f"{scene['id']}.wav"
    write_wav(wav, pcm_all, rate)
    info = {"sceneId": scene["id"], "durationMs": ms_of(pcm_all, rate), "sampleRate": rate, "cues": cues,
            "model": model, "voice": voice, "tempo": tempo, "segments": meta}
    (out_dir / f"{scene['id']}.json").write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
    api = sum(1 for m in meta if m["source"] == "api")
    print(f"✓ {scene['id']}  {info['durationMs']/1000:.1f}s  cues={len(cues)}  ช่วงใหม่={api}/{len(meta)}")
    return info


def audition(out_dir: Path, key, model, style, voices, text=AUDITION_TEXT):
    """ลองเสียงหลายตัวกับประโยคเดียวกัน + วัดอัตราพูด (ตัวอักษร/วินาที) → results.json"""
    out_dir.mkdir(parents=True, exist_ok=True)
    chars = len(re.sub(r"\s|…", "", text))
    results = {"text": text, "chars": chars, "model": model, "style": style, "voices": {}}
    rf = out_dir / "results.json"
    if rf.exists():
        try:
            old = json.loads(rf.read_text(encoding="utf-8"))
            if old.get("text") == text and old.get("style") == style:
                results["voices"] = old.get("voices", {})
        except Exception:
            pass
    for v in voices:
        pcm, rate = synth_pcm(text, key, model, v, style)
        pcm = apply_tempo(trim_silence(pcm, rate, keep_ms=int(cfg("TTS_TRIM_KEEP_MS"))), rate, float(cfg("TTS_TEMPO")))
        write_wav(out_dir / f"{v}.wav", pcm, rate)
        ms = ms_of(pcm, rate)
        results["voices"][v] = {"ms": ms, "charsPerSec": round(chars / max(0.1, ms / 1000), 2), "file": f"{v}.wav"}
        rf.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"✓ {v} → {out_dir / (v + '.wav')}  ({results['voices'][v]['charsPerSec']} ตัว/วิ)")
    print("หมายเหตุ: ประโยคเดียวสั้น ๆ พูดเร็วกว่าบทจริง (บทจริงมีช่วงหยุด) — ใช้เทียบระหว่างเสียง ไม่ใช่ค่า charsPerSec ตรง ๆ")


def main():
    ap = argparse.ArgumentParser(description="OpenRouter (Gemini) TTS สำหรับ shots.json")
    ap.add_argument("shots", type=Path, nargs="?")
    ap.add_argument("--scene", action="append", help="scene id (ใส่ซ้ำได้)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--force", action="store_true", help="ไม่ใช้ cache เรียก API ใหม่ทั้งหมด")
    ap.add_argument("--audition", nargs="*", metavar="VOICE", help="ลองเสียง (ไม่ระบุ = รายชื่อใน voice preset)")
    ap.add_argument("--preset", help="voice preset (presets/voices/<id>.json) สำหรับ --audition")
    ap.add_argument("--slug", help="โปรเจกต์ (ใช้ voice preset ของโปรเจกต์ตอน --audition)")
    args = ap.parse_args()

    repo = Path(__file__).resolve().parent.parent
    load_env(repo / ".env")
    key = os.environ.get("OPENROUTER_API_KEY")

    if args.audition is not None:
        if not key:
            sys.exit("ต้องตั้ง OPENROUTER_API_KEY ใน .env ก่อน")
        data = load_project_settings(repo, args.slug, args.preset)
        tts = (data or {}).get("resolved", {}).get("voice", {}).get("tts", {})
        pid = (data or {}).get("resolved", {}).get("voice", {}).get("id", "default")
        audition(repo / "out" / "audition" / pid, key, cfg("TTS_MODEL"), cfg("TTS_STYLE"),
                 args.audition or tts.get("audition") or AUDITION_VOICES, tts.get("auditionText") or AUDITION_TEXT)
        return
    if not args.shots:
        ap.error("ต้องระบุ shots.json")

    project = json.loads(args.shots.read_text(encoding="utf-8"))
    data = load_project_settings(repo, args.shots.resolve().parent.name)
    model, voice, style = cfg("TTS_MODEL"), cfg("TTS_VOICE"), cfg("TTS_STYLE")
    speech = (data or {}).get("budget", {}).get("speechSec", [150, 185])
    out_dir = repo / "public" / project["meta"]["slug"] / "vo"
    scenes = [s for s in project["scenes"] if not args.scene or s["id"] in args.scene]
    if not scenes:
        sys.exit("ไม่พบ scene ที่ระบุ")
    if not args.dry_run and not key:
        sys.exit("ต้องตั้ง OPENROUTER_API_KEY ใน .env ก่อน")

    print(f"model={model} voice={voice}")
    total = 0
    for s in scenes:
        missing = [sh["id"] for sh in s["shots"][1:] if f"[#{sh['id']}]" not in (s.get("voTTS") or s["vo"])]
        if missing:
            print(f"⚠ {s['id']}: voTTS ไม่มี cue {missing}")
        info = build_scene(s, out_dir, key, model, voice, style, args.dry_run, args.force)
        if info:
            total += info["durationMs"]
    if not args.dry_run and not args.scene:
        sec = total / 1000
        print(f"\nเสียงพากย์รวม {sec:.1f}s — {'OK' if speech[0] <= sec <= speech[1] else f'นอกงบ {speech[0]}–{speech[1]}s (ตรวจงบคำใน settings / rule 01)'}")


if __name__ == "__main__":
    main()
