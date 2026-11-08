// สร้างโปรเจกต์คลิปคลัง (evergreen ไม่ผูกวันที่) → projects/e-<NN>/
//   node scripts/auto/new-backlog.mjs 07
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const R = (...p) => path.join(ROOT, ...p);
const n = process.argv[2];
if (!/^\d{2}$/.test(n ?? '')) { console.error('ใช้: node scripts/auto/new-backlog.mjs <NN>'); process.exit(1); }
const slug = `e-${n}`;
const ch = JSON.parse(fs.readFileSync(R('auto', 'channel.json'), 'utf8'));
const dir = R('projects', slug);
fs.mkdirSync(dir, {recursive: true});
if (!fs.existsSync(path.join(dir, 'settings.json'))) fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify(ch.settings, null, 2) + '\n');
if (!fs.existsSync(path.join(dir, 'status.json'))) fs.writeFileSync(path.join(dir, 'status.json'), JSON.stringify({auto: true, backlog: true, stages: {}}, null, 2) + '\n');
const am = ch.slots.am.post, pm = ch.slots.pm.post;
fs.writeFileSync(path.join(dir, 'publish.json'), JSON.stringify({
  slug, backlog: true, slotLabel: 'คลัง (โพสต์วันไหนก็ได้)',
  postAt: `เลือกวันเอง — เช้า ${am.weekday.time} / เย็น ${pm.weekday.time} (วันธรรมดา) · เช้า ${am.weekend.time} / เย็น ${pm.weekend.time} (วันหยุด)`,
  why: 'คลิปคลังไม่ผูกข่าว ใช้แทนวันที่ไม่มีคลิปข่าว หรือสลับกับคลิปข่าวได้',
  platforms: ch.platforms, note: ch.postTimeNote,
}, null, 2) + '\n');
console.log(`slug ${slug} → projects/${slug}/`);
