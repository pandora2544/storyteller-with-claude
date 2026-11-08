# คลิปเทรนด์อัตโนมัติ — วันละ 2 คลิป (เช้า / เย็น)

ระบบใหม่ต่อยอดจาก HistoryTeller: ใช้เครื่องยนต์เรนเดอร์เดิมทั้งหมด (Remotion, เสียง Gemini TTS, ภาพ AI, ปก, แคปชัน)
แต่ตัดขั้นตอนที่ต้องกดอนุมัติออก แล้วให้ทุกอย่างวิ่งเองตามเวลา — **คุณทำแค่ดูคลิปแล้วโพสต์**

```
05:23 Claude (บัญชี Knight)  ─┐                                   ┌─ Desktop\คลิปพร้อมโพสต์\2026-11-09 เช้า\
14:07 Claude (บัญชี Knight2) ─┤ หาเทรนด์ → ค้นข้อมูล+แหล่ง → บท      │    video.mp4 · cover.jpg
                              │ → shots.json → แคปชัน → push       │    caption-tiktok.txt / -facebook / -instagram
                              ▼                                    │    README.txt (เวลาโพสต์ · จุดต้องเช็ก · ที่มา)
                 GitHub Actions: ภาพ AI → เสียง → เรนเดอร์ → ปก → zip ──┘  (sync-clips.ps1 ดึงลงเครื่องทุก 30 นาที)
```

## ไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `auto/RUNBOOK.md` | คำสั่งที่ Claude ทำทุกรอบ (เลือกเทรนด์ · กฎความปลอดภัย · สูตรแคปชัน/แฮชแท็ก) |
| `auto/channel.json` | เสียง/สไตล์/ความยาว + **เวลาโพสต์แนะนำ** เช้า/เย็น (แก้ได้) |
| `auto/history.jsonl` | หัวข้อที่ทำไปแล้ว (กันซ้ำ 14 วัน) |
| `scripts/auto/new-slot.mjs` | สร้างโปรเจกต์ของรอบ `projects/d-YYYYMMDD-am|pm/` |
| `scripts/auto/autoselect.mjs` | เลือกภาพ AI อัตโนมัติ |
| `scripts/auto/package.mjs` | รวมไฟล์พร้อมโพสต์ |
| `.github/workflows/auto-render.yml` | เรนเดอร์บน GitHub Actions แล้วแปะเป็น Release |
| `auto/windows/install-sync.bat` | ติดตั้งตัวดึงคลิปลงเครื่อง (ดับเบิลคลิกครั้งเดียว) |

## ตั้งค่าครั้งแรก
1. **ใส่ key ใน GitHub** — repo → Settings → Secrets and variables → Actions → New repository secret
   ชื่อ `OPENROUTER_API_KEY` · ค่า = key เดียวกับใน `.env` เดิม
2. **ติดตั้งตัวดึงคลิป** — ดับเบิลคลิก `auto\windows\install-sync.bat`
3. **งานตามเวลา 2 บัญชี** — บัญชี Knight ตั้งรอบเช้าไว้แล้ว · บัญชี Knight2 วาง prompt รอบเย็น (อยู่ด้านล่าง) ในแชตใหม่ของ Knight2

### prompt รอบเย็น (วางใน Knight2)
> ตั้งงานตามเวลาให้หน่อย: ทุกวัน 14:07 เวลาไทย ชื่อ "คลิปเทรนด์ รอบเย็น" — prompt ของงาน:
> "รอบเย็น (pm) ของคลิปเทรนด์อัตโนมัติ บัญชี Knight2: เพิ่ม repo pandora2544/storyteller-with-claude แบบ push แล้ว clone จากนั้นทำตาม auto/RUNBOOK.md ทุกข้อด้วย slot pm จนถึง push และรายงานผล — ห้ามถามผู้ใช้ระหว่างทาง"

## ค่าใช้จ่ายโดยประมาณต่อคลิป
- ภาพ AI 4–6 รูป ≈ $0.2–0.5 (เพดาน $0.8 ต่อคลิป) · เสียง TTS ≈ ไม่กี่เซนต์ → ทั้งหมดจ่ายผ่าน OpenRouter
- GitHub Actions: repo public ใช้ฟรีไม่จำกัด · Claude: ใช้โควตาของแต่ละบัญชีรอบละครั้ง

## ข้อจำกัดที่ควรรู้
- คลิปเป็น **ร่างที่ดีพอโพสต์** แต่ไม่มีคนตรวจทีละช็อตแบบเดิม — ดูคลิปก่อนโพสต์ทุกครั้ง โดยเฉพาะข่าวที่กำลังเปลี่ยน
- repo เป็น public → คลิปใน Releases คนอื่นเปิดดูได้ · ถ้าไม่ต้องการ ตั้ง repo เป็น private แล้วตั้งตัวแปร `GITHUB_TOKEN` ในเครื่อง (ดูหัวไฟล์ sync-clips.ps1)
- เวลาโพสต์ใน `channel.json` มาจากข้อมูลตลาด ไม่ใช่ข้อมูลช่องคุณ — ลงครบ 2 สัปดาห์ ดู Analytics แล้วปรับ
- เรนเดอร์ใหม่คลิปเดิม: GitHub → Actions → auto-render → Run workflow → ใส่ slug
