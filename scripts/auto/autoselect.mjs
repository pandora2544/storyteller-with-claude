// เลือกผู้สมัครรูปแรกของทุกรูปใน images.lock.json อัตโนมัติ (ระบบอัตโนมัติไม่มีคนเลือก — ผู้ใช้ตรวจตอนดูคลิปก่อนโพสต์)
//   node scripts/auto/autoselect.mjs <slug>
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const slug = process.argv[2];
const f = `projects/${slug}/images.lock.json`;
if (!fs.existsSync(f)) { console.log('ไม่มี images.lock.json — ข้าม (ใช้ vector สำรอง)'); process.exit(0); }
const lock = JSON.parse(fs.readFileSync(f, 'utf8'));
const picks = Object.entries(lock.candidates ?? {})
  .filter(([id, c]) => c.length && !lock.selected?.[id])
  .map(([id, c]) => `${id}=${c[0].k}`);
if (!picks.length) { console.log('ไม่มีรูปให้เลือก'); process.exit(0); }
const py = process.env.HT_PYTHON || 'python3';
const r = spawnSync(py, ['scripts/imagegen.py', slug, ...picks.flatMap((p) => ['--select', p])], {stdio: 'inherit'});
process.exit(r.status ?? 1);
