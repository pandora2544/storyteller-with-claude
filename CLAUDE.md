# Storyteller with Claude — Master Rules

ระบบนี้ใช้ Claude ผลิต **วิดีโอ infographic ภาษาไทย** — ความยาว แนวทางภาพ และเสียงผู้เล่า **ตั้งต่อโปรเจกต์** ใน
`projects/<slug>/settings.json` (ค่าเริ่มต้น: 3 นาที · Kurzgesagt × Vox Collage + พื้นผิวตามยุค + 2.5D parallax/DOF ·
เพื่อนชายเล่าให้เพื่อนฟัง ง่วง ๆ นิดนึง) → **ก่อนทำงานทุกครั้งรัน `npm run budget -- <slug>`** เพื่อดูงบ/persona ของโปรเจกต์นั้น

Output ของระบบมี 2 ส่วน:
1. **บทพากย์ + Shot list + ปก** → `projects/<slug>/script.md` และ `projects/<slug>/shots.json` (`covers`)
2. **โค้ดตัดต่อ Remotion** ที่อ่าน `shots.json` แล้ว render เป็นวิดีโอ

## หลักใหญ่ 5 ข้อ (ถ้าขัดกัน ให้ข้อบนชนะ)
1. **ถูกต้องก่อนสวย** — ทุกตัวเลข/ข้อเท็จจริงต้องอยู่ใน `facts.md` พร้อมแหล่งที่มา
2. **หนึ่งช็อต หนึ่งไอเดีย** — ภาพต้องอธิบายสิ่งที่เสียงกำลังพูด *ในวินาทีนั้น*
3. **เสียงตาม persona ภาพมีพลัง** — ภาพต้องขยับ/ตัดต่อตามจังหวะของ style ไม่ให้คนดูเลื่อนหนี
4. **ยุคเปลี่ยน = พื้นผิวเปลี่ยน** — แต่ตัวละคร/ภาษาภาพหลักต้องคงที่ทั้งเรื่อง
5. **เวลาจริงมาจากไฟล์เสียง** — ห้าม hardcode ความยาวช็อต ให้คำนวณจาก VO

## ลำดับการทำงาน
ดู @rules/00-pipeline.md — ทำทีละ stage และหยุดให้ผู้ใช้อนุมัติที่ checkpoint

## HistoryTeller (หน้า UI)
ผู้ใช้อนุมัติ/สั่งแก้/รันงานผ่าน `npm run app` → http://127.0.0.1:4700
ทุกครั้งที่ทำงานในโปรเจกต์: **อ่าน `projects/<slug>/status.json` + feedback ที่ค้างใน `feedback.jsonl` ก่อน** แล้วทำตาม @rules/13-ui-protocol.md
(ห้ามอนุมัติ stage เอง · ปิด feedback ด้วยการ append บรรทัดใหม่ · คำสั่งลัด `/ht-new` `/ht-next` `/ht-feedback`)

## ระบบอัตโนมัติ (คลิปเทรนด์วันละ 2 รอบ)
งานตามเวลา (scheduled task) ทำตาม **@auto/RUNBOOK.md** — ไม่มี checkpoint ระหว่าง stage · โปรเจกต์ชื่อ `projects/d-YYYYMMDD-am|pm` · เรนเดอร์บน GitHub Actions (`.github/workflows/auto-render.yml`) · ภาพรวม `auto/README.md`

## ไฟล์ RULE
- @rules/01-spec-and-timing.md — settings 3 แกน, สูตรงบเวลา/งบคำ/ช็อต
- @rules/02-story-structure.md — โครงเรื่องตามความยาว (Shorts / 7 beat / chapter)
- @rules/03-narration-thai.md — ภาษาบรรยาย (persona อยู่ใน `presets/voices/<voice>.md`)
- @rules/04-visual-style.md — ภาษาภาพ Kurzgesagt × Vox Collage
- @rules/05-era-textures.md — พื้นผิวตามยุค
- @rules/06-camera-parallax-dof.md — 2.5D parallax + depth of field
- @rules/07-infographic-typography.md — ข้อมูล, กราฟ, ตัวอักษรไทย
- @rules/08-audio.md — เสียง, เพลง, SFX
- @rules/09-shotlist-schema.md — schema ของ `shots.json`
- @rules/10-remotion.md — กติกาการเขียนโค้ด Remotion
- @rules/11-qa-checklist.md — เช็กลิสต์ก่อนส่งงาน
- @rules/12-cover.md — ปก YouTube (thumbnail)
- @rules/13-ui-protocol.md — ทำงานคู่กับหน้า HistoryTeller (status.json / feedback.jsonl)
- @rules/14-post.md — ข้อความโพสต์ลงแพลตฟอร์ม (post.json)

## คำสั่ง
```
npm install
npm run app         # HistoryTeller UI → http://127.0.0.1:4700
npm run studio      # เปิด Remotion Studio
npm run budget -- <slug>   # งบของโปรเจกต์ (ความยาว/ตัวอักษร/ช็อต/beat/persona) จาก settings.json
npm run validate    # ตรวจ shots.json ตาม rule + settings
npm run stills      # ภาพนิ่งทุกช็อต → out/stills/<slug>/ (HT_SLUG=<slug>)
npm run render      # → out/coffee-world.mp4 + -master.mp4 (เพลง/SFX ตาม settings, ปรับเสียง −14 LUFS) · โปรเจกต์อื่น: node scripts/render.mjs <slug>
npm run audio       # สร้างเพลงประกอบ + SFX ของช่อง → public/audio/ (ต้องมี numpy)
npm run eras        # ภาพตัวอย่างพื้นผิวทุกยุค → out/eras/
npm run cover       # ปก YouTube ทุกแบบ → out/cover/*.jpg (1280×720) + *-mobile.png
python scripts/imagegen.py <slug> [--only id] [--dry-run]   # ภาพ AI จาก images.json (OpenRouter) → เลือกในหน้า Asset list
node scripts/post.mjs <slug>   # ข้อความโพสต์: ข้อมูลตั้งต้น (--kit) + ตรวจ post.json + out/<slug>-post.md
node scripts/subs.mjs <slug>   # ไฟล์ซับ .srt/.vtt ไทย (+อังกฤษถ้ามี voEn) จากเวลาจริงของเสียง
python scripts/tts.py --audition --slug <slug>             # ลองเสียงตาม voice preset ของโปรเจกต์
python scripts/tts.py projects/coffee-world/shots.json   # เสียงพากย์ (OpenRouter → Gemini TTS)
```

โปรเจกต์ตัวอย่าง: `projects/coffee-world` (กาแฟยึดโลกได้ยังไง · 16:9) · `projects/adam-short-1` (คลิปสั้น 30 วิ แนวตั้ง 9:16 แตกจาก adam)
Format: `landscape-16x9` (YouTube) · `portrait-9x16` (TikTok/Reels/Shorts — ดู rule 01/02/12 · `docs/EXPANSION-DESIGN.md`)
Template: `templates/script.md`, `templates/shots.example.json` · Presets: `presets/{formats,styles,voices}/`
เหตุผลเบื้องหลังการออกแบบ: `docs/ANALYSIS.md` · `docs/UI-DESIGN.md` · `docs/SETTINGS-DESIGN.md`
