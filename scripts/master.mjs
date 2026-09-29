// Master เสียงตาม rule 08: −14 LUFS, true peak ≤ −1 dBTP (loudnorm 2 รอบ, ไม่ encode ภาพใหม่)
// node scripts/master.mjs [in.mp4] [out.mp4]
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';

const inp = process.argv[2] ?? 'out/coffee-world.mp4';
const out = process.argv[3] ?? inp.replace(/\.mp4$/, '-master.mp4');
const TARGET = 'I=-14:TP=-1.5:LRA=11';

// ใช้ ffmpeg ของเครื่องถ้ามี ไม่งั้นใช้ตัวที่มากับ Remotion
const hasSys = spawnSync('ffmpeg', ['-version']).status === 0;
const ff = (args) => hasSys
  ? spawnSync('ffmpeg', args, {encoding: 'utf8', maxBuffer: 1 << 26})
  : spawnSync('npx', ['remotion', 'ffmpeg', ...args], {encoding: 'utf8', maxBuffer: 1 << 26, shell: process.platform === 'win32'});

if (!fs.existsSync(inp)) { console.error(`ไม่พบ ${inp}`); process.exit(1); }
const p1 = ff(['-hide_banner', '-i', inp, '-vn', '-af', `loudnorm=${TARGET}:print_format=json`, '-f', 'null', '-']);
const m = (p1.stderr ?? '').match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
if (!m) { console.error('วัดความดังไม่สำเร็จ (ffmpeg อาจไม่มี filter loudnorm — ติดตั้ง ffmpeg: brew install ffmpeg)'); process.exit(1); }
const j = JSON.parse(m[0]);
const af = `loudnorm=${TARGET}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo`;
const p2 = ff(['-hide_banner', '-y', '-i', inp, '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out]);
if (p2.status !== 0) { console.error(p2.stderr?.slice(-800)); process.exit(1); }
console.log(`✓ ${out}  (ก่อน ${j.input_i} LUFS / ${j.input_tp} dBTP → เป้า −14 LUFS)`);
