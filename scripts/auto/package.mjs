// รวมไฟล์พร้อมโพสต์ของคลิปหนึ่ง → out/package/<slug>/ (+ out/package/<slug>.zip ถ้ามีคำสั่ง zip)
//   node scripts/auto/package.mjs <slug>
// ชื่อไฟล์เป็นอังกฤษล้วน (แตก zip บน Windows ได้ไม่เพี้ยน) · เนื้อหาเป็นไทย UTF-8 (มี BOM ให้ Notepad อ่านถูก)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {assemble, mmss} from '../lib/post.mjs';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) { console.error('ใช้: node scripts/auto/package.mjs <slug>'); process.exit(1); }
const P = (...p) => path.join('projects', slug, ...p);
const dir = path.join('out', 'package', slug);
fs.rmSync(dir, {recursive: true, force: true});
fs.mkdirSync(dir, {recursive: true});
const BOM = '﻿';
const write = (name, text) => fs.writeFileSync(path.join(dir, name), BOM + text.replace(/\r?\n/g, '\r\n'));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// วิดีโอ + ปก + ซับ
const video = [`out/${slug}-master.mp4`, `out/${slug}.mp4`].find((f) => fs.existsSync(f));
if (!video) { console.error(`ไม่พบวิดีโอ out/${slug}-master.mp4`); process.exit(1); }
fs.copyFileSync(video, path.join(dir, 'video.mp4'));
const covers = fs.existsSync('out/cover') ? fs.readdirSync('out/cover').filter((f) => f.startsWith(`${slug}-`) && f.endsWith('.jpg')).sort() : [];
covers.forEach((f, i) => fs.copyFileSync(path.join('out/cover', f), path.join(dir, i === 0 ? 'cover.jpg' : `cover-${f.slice(slug.length + 1)}`)));
for (const ext of ['th.srt']) if (fs.existsSync(`out/${slug}.${ext}`)) fs.copyFileSync(`out/${slug}.${ext}`, path.join(dir, `subtitles.${ext}`));

// แคปชันต่อแพลตฟอร์ม (ประกอบ {{sources}} {{hashtags}} แล้ว)
const r = assemble(slug);
const pub = readJson(P('publish.json'), {});
const want = new Set(pub.platforms ?? ['tiktok', 'facebook', 'instagram']);
const lines = [];
for (const p of r.platforms ?? []) {
  if (!want.has(p.id)) continue;
  const main = p.fields.find((f) => ['caption', 'text'].includes(f.key)) ?? p.fields[0];
  if (!main) continue;
  write(`caption-${p.id}.txt`, main.text.trim() + '\n');
  lines.push(`- ${p.name}: caption-${p.id}.txt (${main.count} ตัวอักษร · แฮชแท็ก ${p.hashtags.length})`);
}

// อ่านก่อนโพสต์
const facts = fs.existsSync(P('facts.md')) ? fs.readFileSync(P('facts.md'), 'utf8') : '';
const check = (facts.split(/^##\s*ต้องเช็กก่อนโพสต์\s*$/m)[1] ?? '').split(/^##\s/m)[0].trim();
const dur = r.kit?.durationSec;
const warn = [];
if (dur && dur > 75) warn.push(`คลิปยาว ${mmss(dur)} — เกิน 1:15 (TikTok/Reels ยังลงได้ แต่คนดูจบน้อยลง)`);
if (r.kit?.durationEstimated) warn.push('ความยาวเป็นค่าประมาณ (เสียงพากย์อาจสร้างไม่ครบ) — เปิดดูคลิปก่อนโพสต์');
const lock = readJson(P('images.lock.json'), {});
const readme = [
  `${r.kit?.title ?? slug}`,
  '='.repeat(40),
  '',
  `รอบ: ${pub.slotLabel ?? ''} ${pub.date ?? ''}`,
  `เวลาโพสต์แนะนำ: ${pub.postAt ?? '-'}`,
  pub.why ? `  เหตุผล: ${pub.why}` : '',
  pub.alt ? `  ทางเลือก: ${pub.alt}` : '',
  `ความยาวคลิป: ${dur ? mmss(dur) : '?'}`,
  `ติดป้ายเนื้อหา AI: ${r.aiDisclosure ? 'ควรติด' : 'ไม่จำเป็น (ภาพการ์ตูน + เสียงบรรยาย)'}${r.notes ? ` — ${r.notes}` : ''}`,
  '',
  'ไฟล์',
  '- video.mp4 — คลิปพร้อมอัปโหลด (1080x1920)',
  covers.length ? '- cover.jpg — ปก (TikTok: เลือก "อัปโหลดปก")' : '- (ไม่มีปก — เลือกเฟรมในแอปแทน)',
  ...lines,
  '',
  ...(warn.length ? ['⚠ คำเตือน', ...warn.map((w) => `- ${w}`), ''] : []),
  'ต้องเช็กก่อนโพสต์ (ข่าวเปลี่ยนเร็ว — เปิดลิงก์ดูว่ายังเป็นจริงไหม)',
  check || '- ไม่มีข้อที่ต้องเช็กเป็นพิเศษ',
  '',
  'แหล่งอ้างอิง',
  ...(r.sources ?? []).map((s) => `- ${s.name}${s.url ? ` — ${s.url}` : ''}`),
  '',
  lock.cost ? `ค่าภาพ AI รอบนี้: $${Number(lock.cost).toFixed(3)}` : '',
  pub.note ? `หมายเหตุเวลาโพสต์: ${pub.note}` : '',
].filter((l) => l !== null).join('\n');
write('README.txt', readme + '\n');
fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({slug, title: r.kit?.title, postAt: pub.postAt, durationSec: dur, platforms: [...want]}, null, 2));

// zip (ถ้ามี) — ใช้บน GitHub Actions
if (spawnSync('zip', ['-v']).status === 0) {
  const z = spawnSync('zip', ['-qr', `../${slug}.zip`, '.'], {cwd: dir});
  if (z.status === 0) console.log(`→ out/package/${slug}.zip`);
}
console.log(`→ ${dir}/ (${fs.readdirSync(dir).join(', ')})`);
