// ตรวจไฟล์วิดีโอ output: ความยาว / มีเสียงไหม / ความดัง (LUFS) — แคชตาม path+ขนาด+เวลาแก้ไข
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
import {P, writeAtomic} from './project.mjs';

const CACHE = P('out', '.ht-media-cache.json');
let cache = null;
const loadCache = () => {
  if (cache) return cache;
  try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')); } catch { cache = {}; }
  return cache;
};
const saveCache = () => { try { writeAtomic(CACHE, JSON.stringify(cache)); } catch {} };

/** หา ffprobe/ffmpeg: ของเครื่องก่อน ไม่งั้นใช้ตัวที่มากับ Remotion (node_modules/@remotion/compositor-*) */
const findBin = (name) => {
  if (spawnSync(name, ['-version']).status === 0) return name;
  const base = P('node_modules', '@remotion');
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter((x) => x.startsWith('compositor-'))) {
      const f = path.join(base, d, process.platform === 'win32' ? `${name}.exe` : name);
      if (fs.existsSync(f)) return f;
    }
  }
  return null;
};
export const BIN = {ffprobe: findBin('ffprobe'), ffmpeg: findBin('ffmpeg')};

const run = (bin, args) => new Promise((resolve) => {
  const p = spawn(bin, args, {cwd: P()});
  let out = '';
  let err = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (err += d));
  p.on('close', (code) => resolve({code, out, err}));
  p.on('error', () => resolve({code: -1, out, err}));
});

const inflight = new Map();

/** ข้อมูลไฟล์ (อาจยังไม่มี loudness ถ้ากำลังวัดอยู่) */
export const probe = async (rel, {loudness = true} = {}) => {
  const abs = P(rel);
  const st = fs.statSync(abs);
  const key = `${rel}|${st.size}|${Math.round(st.mtimeMs)}`;
  const c = loadCache();
  if (c[key] && (!loudness || c[key].lufs !== undefined)) return c[key];
  if (inflight.has(key)) return inflight.get(key);
  const job = (async () => {
    const info = {path: rel, bytes: st.size, mtime: st.mtimeMs, duration: null, hasAudio: null, width: null, height: null};
    if (BIN.ffprobe) {
      const r = await run(BIN.ffprobe, ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', rel]);
      try {
        const j = JSON.parse(r.out);
        info.duration = Number(j.format?.duration) || null;
        info.hasAudio = (j.streams ?? []).some((s) => s.codec_type === 'audio');
        const v = (j.streams ?? []).find((s) => s.codec_type === 'video');
        info.width = v?.width ?? null;
        info.height = v?.height ?? null;
      } catch {}
    }
    if (loudness && info.hasAudio && BIN.ffmpeg) {
      const r = await run(BIN.ffmpeg, ['-hide_banner', '-nostats', '-i', rel, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
      const sum = r.err.slice(r.err.lastIndexOf('Summary'));
      const I = sum.match(/I:\s+(-?[\d.]+) LUFS/);
      const pk = sum.match(/Peak:\s+(-?[\d.]+) dBFS/);
      info.lufs = I ? Number(I[1]) : null;
      info.peak = pk ? Number(pk[1]) : null;
    } else if (loudness) {
      info.lufs = null;
      info.peak = null;
    }
    c[key] = info;
    saveCache();
    return info;
  })();
  inflight.set(key, job);
  try { return await job; } finally { inflight.delete(key); }
};

/** รายการวิดีโอใน out/ ที่เป็นของโปรเจกต์นี้ (รวม out/dump) — ใหม่สุดก่อน */
export const listOutputs = (slug) => {
  const res = [];
  for (const dir of ['out', 'out/dump', 'out/archive']) {
    if (!fs.existsSync(P(dir))) continue;
    for (const f of fs.readdirSync(P(dir))) {
      if (!f.endsWith('.mp4') || !f.startsWith(slug)) continue;
      const rel = `${dir}/${f}`;
      res.push({path: rel, name: f, dir, mtime: fs.statSync(P(rel)).mtimeMs, master: f.endsWith('-master.mp4')});
    }
  }
  return res.sort((a, b) => b.mtime - a.mtime);
};
