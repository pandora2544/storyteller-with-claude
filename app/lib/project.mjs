// โมเดลโปรเจกต์: อ่านไฟล์ใน projects/<slug>/ + สถานะ (status.json) + คิว feedback (feedback.jsonl)
// ไฟล์คือความจริงหนึ่งเดียว — ไม่มีฐานข้อมูลแยก (docs/UI-DESIGN.md)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadSettings, settingsFingerprint, resolve as resolveSettings} from '../../scripts/lib/settings.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const P = (...xs) => path.join(ROOT, ...xs);

export const STAGES = [
  {key: 'brief', n: 1, name: 'Brief', file: 'brief.md', checkpoint: true},
  {key: 'research', n: 2, name: 'ค้นคว้า (facts)', file: 'facts.md'},
  {key: 'beats', n: 3, name: 'Beat sheet', file: 'beats.md', checkpoint: true},
  {key: 'script', n: 4, name: 'บทพากย์', file: 'script.md', checkpoint: true},
  {key: 'shots', n: 5, name: 'Shot list', file: 'shots.json'},
  {key: 'assets', n: 6, name: 'Asset list', file: 'assets.md'},
  {key: 'voice', n: 7, name: 'เสียงพากย์', checkpoint: true},
  {key: 'preview', n: 8, name: 'Preview & Render'},
  {key: 'qa', n: 9, name: 'QA', checkpoint: true},
  {key: 'cover', n: 10, name: 'ปก YouTube', checkpoint: true},
  {key: 'post', n: 11, name: 'โพสต์ (แคปชัน)', file: 'post.json', checkpoint: true},
];
export const STATES = ['todo', 'draft', 'review', 'approved', 'stale'];

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const validSlug = (s) => typeof s === 'string' && SLUG_RE.test(s);

const readText = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const readJson = (f, dflt = null) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; }
};
/** เขียนแบบ atomic: เขียนไฟล์ชั่วคราวแล้ว rename — กันไฟล์ครึ่ง ๆ ตอน Claude อ่านพร้อมกัน */
export const writeAtomic = (f, text) => {
  fs.mkdirSync(path.dirname(f), {recursive: true});
  const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, f);
};
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

export const listSlugs = () =>
  fs.existsSync(P('projects'))
    ? fs.readdirSync(P('projects')).filter((d) => validSlug(d) && fs.statSync(P('projects', d)).isDirectory()).sort()
    : [];

export const loadShots = (slug) => readJson(P('projects', slug, 'shots.json'));

/** ลายนิ้วมือของเนื้อหาแต่ละ stage — ใช้ตรวจ "ล้าสมัย" (แก้ไฟล์หลังอนุมัติ) */
const stageFingerprint = (slug, st) => {
  const dir = P('projects', slug);
  if (st.file && st.key !== 'shots') {
    const t = readText(path.join(dir, st.file));
    return t == null ? null : sha(t);
  }
  const shots = loadShots(slug);
  if (st.key === 'shots') {
    if (!shots) return null;
    const {covers, ...rest} = shots; // ปกแยกเป็น stage ของตัวเอง
    return sha(JSON.stringify(rest));
  }
  if (st.key === 'voice') {
    const vd = P('public', slug, 'vo');
    if (!shots || !fs.existsSync(vd)) return null;
    const parts = shots.scenes.map((s) => readText(path.join(vd, `${s.id}.json`)));
    return parts.every(Boolean) ? sha(parts.join('|')) : null;
  }
  if (st.key === 'preview') {
    const cands = ['out', 'out/dump', 'out/archive'].flatMap((d) => [P(d, `${slug}-master.mp4`), P(d, `${slug}.mp4`)]);
    const x = cands.find((f) => fs.existsSync(f)) ?? null;
    if (!x) return null;
    const s = fs.statSync(x);
    return sha(`${x}|${s.size}|${s.mtimeMs}`);
  }
  if (st.key === 'cover') {
    if (!shots?.covers?.length) return null;
    return sha(JSON.stringify(shots.covers));
  }
  if (st.key === 'qa') return 'qa';
  return null;
};

export const statusPath = (slug) => P('projects', slug, 'status.json');
export const loadStatus = (slug) => {
  const s = readJson(statusPath(slug), {}) || {};
  s.stages ??= {};
  s.qa ??= {manual: {}};
  s.qa.manual ??= {};
  s.cover ??= {selected: null};
  return s;
};
export const saveStatus = (slug, s) => writeAtomic(statusPath(slug), JSON.stringify(s, null, 2) + '\n');

/** รวมสถานะที่บันทึกไว้ + สิ่งที่เห็นจากไฟล์จริง → สถานะที่ UI แสดง */
export const deriveStages = (slug) => {
  const status = loadStatus(slug);
  const settings = loadSettings(slug);
  let dirty = false;
  const out = STAGES.map((st) => {
    const rec = status.stages[st.key] ?? {};
    const fp = stageFingerprint(slug, st);
    const sfp = settingsFingerprint(settings, st.key);
    let state = rec.state;
    let staleBy = null;
    if (state === 'approved') {
      if (!rec.hash && fp) { rec.hash = fp; status.stages[st.key] = rec; dirty = true; } // อนุมัติก่อนมีระบบ hash
      else if (rec.hash && fp && rec.hash !== fp && st.key !== 'qa') { state = 'stale'; staleBy = 'file'; }
      if (sfp && !rec.settingsHash) { rec.settingsHash = sfp; status.stages[st.key] = rec; dirty = true; }
      else if (sfp && rec.settingsHash !== sfp) { state = 'stale'; staleBy = staleBy ?? 'settings'; }
    }
    if (!state) state = fp ? 'review' : 'todo';
    return {...st, state, staleBy, at: rec.at ?? null, note: rec.note ?? null, exists: !!fp};
  });
  if (dirty) saveStatus(slug, status);
  return out;
};

export const setStage = (slug, key, state, note) => {
  const st = STAGES.find((s) => s.key === key);
  if (!st) throw new Error('ไม่รู้จัก stage ' + key);
  if (!['todo', 'draft', 'review', 'approved'].includes(state)) throw new Error('สถานะไม่ถูกต้อง');
  const status = loadStatus(slug);
  const sfp = settingsFingerprint(loadSettings(slug), key);
  status.stages[key] = {state, at: new Date().toISOString(), by: 'user', ...(note ? {note} : {}), ...(state === 'approved' ? {hash: stageFingerprint(slug, st), ...(sfp ? {settingsHash: sfp} : {})} : {})};
  saveStatus(slug, status);
};

// ---------- feedback.jsonl ----------
export const feedbackPath = (slug) => P('projects', slug, 'feedback.jsonl');
/** อ่าน event ทั้งหมดแล้วพับเป็นรายการล่าสุดต่อ id */
export const loadFeedback = (slug) => {
  const t = readText(feedbackPath(slug));
  if (!t) return [];
  const map = new Map();
  for (const line of t.split('\n')) {
    if (!line.trim()) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (!e.id) continue;
    const prev = map.get(e.id) ?? {};
    map.set(e.id, {...prev, ...e, createdAt: prev.createdAt ?? e.at, history: [...(prev.history ?? []), e]});
  }
  return [...map.values()].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
};
const appendFeedback = (slug, e) => {
  fs.appendFileSync(feedbackPath(slug), JSON.stringify(e) + '\n');
};
export const addFeedback = (slug, target, text, by = 'user') => {
  const n = loadFeedback(slug).length + 1;
  const id = `fb-${String(n).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex')}`;
  const e = {id, target, text, status: 'open', by, at: new Date().toISOString()};
  appendFeedback(slug, e);
  return e;
};
export const updateFeedback = (slug, id, status, note) => {
  if (!['open', 'done', 'dismissed'].includes(status)) throw new Error('สถานะ feedback ไม่ถูกต้อง');
  if (!loadFeedback(slug).some((f) => f.id === id)) throw new Error('ไม่พบ ' + id);
  const e = {id, status, by: 'user', at: new Date().toISOString(), ...(note ? {note} : {})};
  appendFeedback(slug, e);
  return e;
};

// ---------- ข้อมูลประกอบ ----------
const CUE = /\[#([A-Za-z0-9_-]+)\]/g;
export const speakChars = (s) => s.replace(CUE, '').replace(/[\s…]/g, '').length;

export const splitByCue = (vo, firstId) => {
  const parts = [];
  let last = 0;
  let id = firstId;
  vo.replace(CUE, (m, cue, idx) => {
    parts.push({id, text: vo.slice(last, idx).trim()});
    id = cue;
    last = idx + m.length;
    return m;
  });
  parts.push({id, text: vo.slice(last).trim()});
  return parts;
};

export const voInfo = (slug, shots) => {
  const vd = P('public', slug, 'vo');
  const out = {};
  for (const s of shots?.scenes ?? []) {
    const j = readJson(path.join(vd, `${s.id}.json`));
    const wav = path.join(vd, (s.voFile ?? `vo/${s.id}.wav`).replace(/^vo\//, ''));
    out[s.id] = j ? {durationMs: j.durationMs, cues: Object.keys(j.cues ?? {}).length, expectedCues: s.shots.length - 1, voice: j.voice, model: j.model, wav: fs.existsSync(wav) ? `public/${slug}/vo/${path.basename(wav)}` : null, mtime: fs.statSync(path.join(vd, `${s.id}.json`)).mtimeMs} : null;
  }
  return out;
};

/** ภาพนิ่งต่อช็อต: out/stills/<slug>/<id>.png (ใหม่) หรือ out/stills/<id>.png (เดิม) */
export const stillsInfo = (slug, shots) => {
  const res = {};
  const shotsMtime = fs.existsSync(P('projects', slug, 'shots.json')) ? fs.statSync(P('projects', slug, 'shots.json')).mtimeMs : 0;
  for (const s of shots?.scenes ?? []) for (const sh of s.shots) {
    for (const rel of [`out/stills/${slug}/${sh.id}.png`, `out/stills/${sh.id}.png`]) {
      if (fs.existsSync(P(rel))) {
        const m = fs.statSync(P(rel)).mtimeMs;
        res[sh.id] = {path: rel, mtime: m, maybeStale: m < shotsMtime};
        break;
      }
    }
  }
  return res;
};

export const coversInfo = (slug, shots) =>
  (shots?.covers ?? []).map((c) => {
    const img = `out/cover/${slug}-${c.id}.jpg`;
    const mob = `out/cover/${slug}-${c.id}-mobile.png`;
    const ex = fs.existsSync(P(img));
    return {
      id: c.id, era: c.era ?? 'present', title: c.title, kicker: c.kicker ?? null, note: c.note ?? null, sourceRef: c.sourceRef ?? null,
      image: ex ? img : null, mobile: fs.existsSync(P(mob)) ? mob : null,
      bytes: ex ? fs.statSync(P(img)).size : null, mtime: ex ? fs.statSync(P(img)).mtimeMs : null,
    };
  });

export const docs = (slug) => {
  const dir = P('projects', slug);
  const o = {};
  for (const f of ['brief.md', 'facts.md', 'beats.md', 'script.md', 'assets.md', 'request.md']) o[f] = readText(path.join(dir, f));
  return o;
};

/** ชื่อ/สรุปโปรเจกต์สำหรับหน้าแรก */
/** ข้อมูล settings ย่อสำหรับการ์ดหน้าแรก (format/ความยาว/เสียง/ซับ) */
const cardSettings = (slug) => {
  try {
    const r = resolveSettings(loadSettings(slug));
    return {format: {id: r.format.id, portrait: r.format.height > r.format.width}, targetSec: r.targetSec, voice: r.voice.name, style: r.style.name, subtitles: r.subtitles};
  } catch { return {format: null, targetSec: null, voice: null, style: null, subtitles: null}; }
};
export const summary = (slug) => {
  const shots = loadShots(slug);
  const stages = deriveStages(slug);
  const fb = loadFeedback(slug);
  const title = shots?.meta?.title ?? (readText(P('projects', slug, 'brief.md'))?.match(/^#\s*(?:Brief\s*[—-]\s*)?(.+)$/m)?.[1]) ?? readJson(P('projects', slug, 'request.json'))?.topic ?? slug;
  const covers = coversInfo(slug, shots);
  const status = loadStatus(slug);
  const cover = covers.find((c) => c.id === status.cover.selected) ?? covers[0];
  const still = Object.values(stillsInfo(slug, shots))[0];
  return {
    slug, title,
    scenes: shots?.scenes?.length ?? 0,
    shots: shots?.scenes?.reduce((a, s) => a + s.shots.length, 0) ?? 0,
    eras: [...new Set(shots?.scenes?.map((s) => s.era) ?? [])],
    stages: stages.map(({key, n, name, state}) => ({key, n, name, state})),
    openFeedback: fb.filter((f) => f.status === 'open').length,
    thumb: cover?.image ?? still?.path ?? null,
    ...cardSettings(slug),
    derivedFrom: readText(P('projects', slug, 'request.md'))?.match(/แตกจากโปรเจกต์:\*\*\s*`projects\/([a-z0-9-]+)`/)?.[1] ?? null,
    updated: Math.max(0, ...['status.json', 'shots.json', 'script.md', 'brief.md', 'feedback.jsonl'].map((f) => { try { return fs.statSync(P('projects', slug, f)).mtimeMs; } catch { return 0; } })),
  };
};
