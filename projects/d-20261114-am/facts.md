# Facts — โดรน 800 ลำ บินไม่ชนกันได้ยังไง (d-20261114-am)

ค้นเมื่อ 2026-11-14 เช้า (เวลาไทย) · งานวิจิตรเจ้าพระยา 2569 เปิด 13 พ.ย. · แหล่งหลัก: สื่อไทย (ฐานเศรษฐกิจ, คมชัดลึก) + เอกสารเทคนิคของผู้ผลิตระบบโดรนโชว์ (Verge Aero, Skybrush, Pyrotecnico) + เอกสาร PX4 (ระบบควบคุมการบินโอเพนซอร์ส)

| ID | ข้อเท็จจริง | ความมั่นใจ | แหล่ง |
|---|---|---|---|
| F-01 | งาน "วิจิตรเจ้าพระยา 2569" โดย ททท. 13 พ.ย.–13 ธ.ค. 2569 ริมเจ้าพระยา (สะพานพระราม 8–พระราม 3) 18.00–22.00 น. ฟรี · มีโดรนแปรอักษร 800 ลำ เหนือวัดอรุณฯ 19.50 น. คืนละรอบ เฉพาะวันที่ 12, 13, 15, 18, 20, 25, 27 พ.ย. และ 2, 4, 9, 11 ธ.ค. | สูง | [ฐานเศรษฐกิจ](https://www.thansettakij.com/business/tourism/673648) · 13 พ.ย. 2569 · [คมชัดลึก](https://www.komchadluek.net/kom-lifestyle/travel/625581) · พ.ย. 2569 |
| F-02 | โดรนโชว์ไม่ได้ใช้คนบังคับทีละลำ — ทุกท่าออกแบบล่วงหน้า แต่ละลำบินตามเส้นทาง (flight plan) ของตัวเองอัตโนมัติ · นักบินแค่สั่งทั้งฝูง เช่น เริ่ม/ลงจอด/ยกเลิก | สูง | [Verge Aero](https://docs.verge.aero/drone-show-technology/how-drone-shows-work-an-overview) · [Skybrush FAQ](https://docs.skybrush.io/public/faq/latest/overview.html) · [Pyrotecnico](https://pyrotecnico.com/news/what-is-a-drone-show/) |
| F-03 | โดรนในโชว์ไม่ได้สื่อสารกันเอง — แต่ละลำไม่ต้องรู้ตำแหน่งลำอื่น เพราะเส้นทางถูกวางไม่ให้ชนกันแล้ว | สูง (Skybrush ระบุตรง · Verge ระบุว่าตำแหน่งลำอื่น "ไม่สำคัญ") | [Skybrush FAQ](https://docs.skybrush.io/public/faq/latest/overview.html) · [Verge Aero](https://docs.verge.aero/drone-show-technology/how-drone-shows-work-an-overview) |
| F-04 | GPS ทั่วไปคลาดได้หลายเมตร · ระบบ RTK ใช้สถานีอ้างอิงภาคพื้นส่งค่าแก้ ทำให้แม่นเหลือราว "ไม่กี่เซนติเมตร" | สูง | [Verge Aero](https://docs.verge.aero/drone-show-technology/how-drone-shows-work-an-overview) · [Pyrotecnico](https://pyrotecnico.com/news/what-is-a-drone-show/) |
| F-05 | เวลาจากระบบดาวเทียม (GNSS/GPS) แม่นราว 100 ส่วนพันล้านวินาที (ระดับนาโนวินาที) → ทุกลำเริ่ม/ขยับพร้อมกันได้ · บทพูดใช้ "คลาดไม่ถึงหนึ่งในล้านวินาที" (100 นาโนวินาที < 1 ไมโครวินาที) | กลาง-สูง | [Verge Aero](https://docs.verge.aero/drone-show-technology/how-drone-shows-work-an-overview) · [Skybrush FAQ](https://docs.skybrush.io/public/faq/latest/overview.html) |
| F-06 | การกันชนทำตั้งแต่ขั้นออกแบบ: ซอฟต์แวร์จำลองการบิน จำกัดความเร็ว และรักษาระยะห่างที่ปลอดภัยระหว่างทุกลำ วางเส้นทางเปลี่ยนท่าไม่ให้ตัดกัน | สูง | [Verge Aero](https://docs.verge.aero/drone-show-technology/how-drone-shows-work-an-overview) · [Skybrush FAQ](https://docs.skybrush.io/public/faq/latest/overview.html) |
| F-07 | ระบบป้องกัน (failsafe): โดรนที่แบตอ่อนหรือสัญญาณหลุดถูกตั้งให้ลงจอดแบบควบคุม · มีรั้วเสมือน (geofence) กันออกนอกพื้นที่ | กลาง (โชว์: Pyrotecnico · กลไก failsafe แบตอ่อน→ลงจอด: PX4) | [Pyrotecnico](https://pyrotecnico.com/news/what-is-a-drone-show/) · [PX4 Safety](https://docs.px4.io/v1.14/en/config/safety.html) |

## หมายเหตุ
- เทคนิคเป็นหลักการทั่วไปของระบบโดรนโชว์ — ไม่ได้ยืนยันว่าผู้จัดงานวิจิตรเจ้าพระยาใช้ระบบยี่ห้อใด บทจึงพูดเป็น "โดรนโชว์" ทั่วไป ไม่ระบุบริษัท
- "ไม่มีใครถือจอยบังคับทีละลำ" ถูกต้องตาม F-02 (มีนักบินคุมทั้งฝูง แต่ไม่บังคับรายลำ)
- ไม่ใส่สถิติสถิติโลกจำนวนโดรน (ตัวเลขเปลี่ยนบ่อย)
- ระยะห่างระหว่างลำ: แหล่งไม่ให้ตัวเลขชัด → บทพูดแค่ "เว้นระยะ" ไม่ใส่ตัวเลข

## ต้องเช็กก่อนโพสต์
- F-01 ตารางโดรน (คืนถัดไป 15 พ.ย. 19.50 น.) — เช็กเพจทางการ "Vijit Chao Phraya 2026" ว่าไม่มีเลื่อน/ยกเลิก (ฝน) ก่อนโพสต์ · คมชัดลึกสรุปจำนวนจุดแสดงไม่ตรงกัน (18 vs 19) — บทไม่ได้ใช้ตัวเลขนี้
- F-05 "คลาดไม่ถึงหนึ่งในล้านวินาที" เป็นการปัดจาก ~100 นาโนวินาที (Verge) — ถูกในทิศทาง แต่เป็นตัวเลขจากผู้ผลิต
- F-07 failsafe ของโชว์มีแหล่งโชว์แหล่งเดียว (Pyrotecnico) + หลักการ PX4 — บทจึงใช้ "ถูกตั้งให้ลงจอดเอง"
