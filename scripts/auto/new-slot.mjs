// สร้างโปรเจกต์คลิปอัตโนมัติของรอบนี้ → projects/d-<YYYYMMDD>-<am|pm>/
//   node scripts/auto/new-slot.mjs am            (วันที่ = วันนี้ตามเวลาไทย)
//   node scripts/auto/new-slot.mjs pm 2026-11-09
// พิมพ์: slug · เวลาโพสต์ที่แนะนำ · หัวข้อที่ทำไปแล้ว 14 วันล่าสุด (กันซ้ำ)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = (...p) => path.join(ROOT, ...p);
const slot = process.argv[2];
if (!['am', 'pm'].includes(slot)) { console.error('ใช้: node scripts/auto/new-slot.mjs <am|pm> [YYYY-MM-DD]'); process.exit(1); }

const bkk = (d = new Date()) => new Date(d.getTime() + 7 * 3600e3); // UTC+7 (ไทยไม่มี DST)
const date = process.argv[3] ?? bkk().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('วันที่ต้องเป็น YYYY-MM-DD'); process.exit(1); }
const slug = `d-${date.replaceAll('-', '')}-${slot}`;
const ch = JSON.parse(fs.readFileSync(R('auto', 'channel.json'), 'utf8'));
const dir = R('projects', slug);
const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
const weekend = dow === 0 || dow === 6;
const post = ch.slots[slot].post[weekend ? 'weekend' : 'weekday'];

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(ch.settings, null, 2) + '\n');
  fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({auto: true, stages: {}}, null, 2) + '\n');
}
fs.writeFileSync(path.join(dir, 'publish.json'), JSON.stringify({
  slug, date, slot, slotLabel: ch.slots[slot].label,
  postAt: `${date} ${post.time}`, why: post.why, alt: ch.slots[slot].post.alt ?? null,
  platforms: ch.platforms, note: ch.postTimeNote,
}, null, 2) + '\n');

const since = Date.parse(`${date}T00:00:00Z`) - 14 * 86400e3;
const recent = fs.readFileSync(R('auto', 'history.jsonl'), 'utf8').split('\n').filter(Boolean)
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter((h) => h && Date.parse(h.date + 'T00:00:00Z') >= since);

console.log(`slug ${slug}`);
console.log(`โฟลเดอร์ projects/${slug}/`);
console.log(`โพสต์แนะนำ ${date} ${post.time} (${weekend ? 'วันหยุด' : 'วันธรรมดา'}) — ${post.why}`);
console.log(`หัวข้อ 14 วันล่าสุด (ห้ามซ้ำ/ห้ามมุมเดิม): ${recent.length ? '' : '—'}`);
for (const h of recent) console.log(`  ${h.date} ${h.slot} · ${h.category ?? ''} · ${h.title}`);
