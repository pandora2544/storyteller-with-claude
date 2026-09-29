// ข้อความสำหรับโพสต์ลงแพลตฟอร์ม (stage 11 · rules/14-post.md)
// Claude เขียน projects/<slug>/post.json → ไฟล์นี้ประกอบข้อความจริง (แทน {{chapters}} {{sources}} {{credit}} {{hashtags}})
// แล้วนับตัวอักษรเทียบ presets/platforms.json · ใช้ทั้งใน scripts/post.mjs และหน้า HistoryTeller
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSettings, resolve, budget} from './settings.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = (...xs) => path.join(ROOT, ...xs);
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const CUE = /\[#([A-Za-z0-9_-]+)\]/g;
const HEAD = 6 / 30, TAIL = 12 / 30;
const speak = (s) => s.replace(CUE, '').replace(/[\s…]/g, '').length;
export const len = (s) => [...String(s ?? '')].length;

/** เวลาเริ่มของแต่ละซีน — สูตรเดียวกับ scripts/subs.mjs / src/timing/resolve.ts (มีเสียงจริงใช้เสียงจริง ไม่มีก็ประมาณ) */
export const timeline = (slug, p) => {
  const fps = p.meta?.fps ?? 30;
  const cps = budget(resolve(loadSettings(slug))).charsPerSec;
  const tf = (i) => (i === 0 ? 0 : p.scenes[i].era !== p.scenes[i - 1].era ? 20 : 12);
  const n = p.scenes.length;
  let start = 0, estimated = 0;
  const out = p.scenes.map((s, i) => {
    const vo = readJson(P('public', slug, 'vo', `${s.id}.json`));
    if (!vo) estimated++;
    const txt = s.voTTS || s.vo;
    const speech = vo ? vo.durationMs / 1000 : speak(txt) / cps + (txt.match(/…/g)?.length ?? 0) * 0.3;
    const dur = Math.round((HEAD + speech + TAIL + (s.holdAfter ?? 0)) * fps) + tf(i + 1 < n ? i + 1 : 0);
    const row = {id: s.id, beat: s.beat, start: start / fps};
    start += dur - (i + 1 < n ? tf(i + 1) : 0);
    return row;
  });
  return {scenes: out, total: start / fps, estimated: estimated > 0};
};
export const mmss = (sec) => { const s = Math.max(0, Math.floor(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/** แหล่งอ้างอิงจาก facts.md (คอลัมน์สุดท้ายของแถว | Fxx |) — ไม่ซ้ำ ตามลำดับ */
export const sourcesFrom = (slug) => {
  const f = P('projects', slug, 'facts.md');
  if (!fs.existsSync(f)) return [];
  const seen = new Set(), out = [];
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!/^\|\s*[FC]-?\d+/.test(line)) continue; // รับทั้ง F01 และ F-01 (templates ใช้ F-01)
    const cells = line.split('|').map((x) => x.trim()).filter(Boolean);
    // คอลัมน์ที่มา = คอลัมน์ขวาสุดที่มีลิงก์ (ไม่งั้นใช้คอลัมน์สุดท้ายเหมือนเดิม)
    const src = [...cells].reverse().find((c) => /https?:\/\//.test(c)) ?? cells[cells.length - 1];
    if (!src) continue;
    for (const part of src.split(/\s+·\s+/)) {
      const url = part.match(/https?:\/\/\S+/)?.[0]?.replace(/[)\].,]+$/, '');
      if (!url || seen.has(url)) continue; // ส่วนที่ไม่มีลิงก์ (เช่น "ลิงก์เดียวกับ F01") ข้าม
      seen.add(url);
      out.push({name: part.replace(/https?:\/\/\S+/, '').replace(/\*/g, '').replace(/[\s—–-]+$/, '').trim(), url});
    }
  }
  return out;
};

/** บท YouTube: ซีนละบท (ตั้งชื่อใน post.json → chapters.S01) · บทแรก 0:00 · บท < 10 วิ รวมกับบทก่อนหน้า · ต้อง ≥ 3 บท */
export const chaptersFor = (tl, titles = {}) => {
  const rows = [];
  for (const s of tl.scenes) {
    const title = titles[s.id];
    if (!title) continue;
    if (rows.length && s.start - rows[rows.length - 1].start < 10) continue;
    rows.push({start: rows.length ? s.start : 0, title});
  }
  const last = rows[rows.length - 1];
  if (last && tl.total - last.start < 10) rows.pop();
  return rows.length >= 3 ? rows : [];
};

const tagify = (h) => (String(h).startsWith('#') ? String(h) : `#${h}`).replace(/\s+/g, '');

export const assemble = (slug, override) => {
  const post = override ?? readJson(P('projects', slug, 'post.json'));
  const shots = readJson(P('projects', slug, 'shots.json'));
  const settings = resolve(loadSettings(slug));
  const fmt = settings.format?.id ?? loadSettings(slug).format ?? 'landscape-16x9';
  const presets = readJson(P('presets', 'platforms.json'), {platforms: []}).platforms;
  const channel = readJson(P('presets', 'channel.json'), {});
  const tl = shots ? timeline(slug, shots) : null;
  const sources = sourcesFrom(slug);
  const kit = {slug, title: shots?.meta?.title ?? slug, format: fmt, durationSec: tl?.total ?? null, durationEstimated: tl?.estimated ?? true,
    platforms: presets.filter((x) => x.formats.includes(fmt)).map((x) => x.id), sources: sources.length,
    covers: (shots?.covers ?? []).map((c) => ({id: c.id, title: c.title.replace(/\*/g, '').replace(/\n/g, ' ')})), sceneStarts: tl?.scenes.map((s) => `${s.id} ${s.beat} ${mmss(s.start)}`) ?? []};
  if (!post) return {exists: false, kit, platforms: [], warnings: [], errors: []};

  const chapters = tl && fmt === 'landscape-16x9' ? chaptersFor(tl, post.chapters ?? {}) : []; // Shorts ไม่มีบทคลิป
  const credit = [channel.creditLine, post.credit].filter(Boolean).join('\n');
  const srcText = sources.map((s) => `• ${s.name}${s.url ? ` — ${s.url}` : ''}`).join('\n');
  const warnings = [], errors = [];
  if (post.chapters && !chapters.length && fmt === 'landscape-16x9') warnings.push('บท YouTube ใช้ไม่ได้ (ต้อง ≥ 3 บท บทละ ≥ 10 วิ) — ตัด {{chapters}} ออกให้');
  if (tl?.estimated && chapters.length) warnings.push('ยังไม่มีเสียงพากย์ครบ — เวลาในบท (chapters) เป็นค่าประมาณ สร้างเสียงแล้วเปิดดูใหม่');

  const fill = (text, hashtags) => {
    let t = String(text ?? '');
    const hs = (hashtags ?? []).map(tagify).join(' ');
    t = t.replace(/\{\{chapters\}\}/g, chapters.map((c) => `${mmss(c.start)} ${c.title}`).join('\n'))
      .replace(/\{\{sources\}\}/g, srcText).replace(/\{\{credit\}\}/g, credit).replace(/\{\{hashtags\}\}/g, hs);
    if (hs && hashtags?.length && !/\{\{hashtags\}\}/.test(String(text)) && !t.includes(hs)) t = `${t.trimEnd()}\n\n${hs}`;
    return t.replace(/\n{3,}/g, '\n\n').trim();
  };

  const platforms = [];
  for (const pf of presets) {
    const d = post.platforms?.[pf.id];
    if (!d) { if (pf.formats.includes(fmt)) warnings.push(`${pf.name}: ยังไม่มีข้อความ`); continue; }
    const hs = d.hashtags ?? [];
    const fields = [];
    for (const f of pf.fields) {
      let raw = d[f.key];
      if (raw == null) { if (!f.optional) warnings.push(`${pf.name}: ไม่มี ${f.label}`); continue; }
      if (f.list) {
        const text = (Array.isArray(raw) ? raw : String(raw).split(',')).map((x) => String(x).trim()).filter(Boolean).join(', ');
        fields.push({key: f.key, label: f.label, text, count: len(text), limit: f.limit, ideal: f.ideal ?? null});
      } else if (f.each) {
        (Array.isArray(raw) ? raw : [raw]).forEach((t, i) => fields.push({key: `${f.key}.${i + 1}`, label: `${f.label} ${i + 1}`, text: fill(t), count: len(fill(t)), limit: f.limit, ideal: f.ideal ?? null}));
      } else {
        const text = fill(raw, f.hashtags ? hs : null);
        fields.push({key: f.key, label: f.label, text, count: len(text), limit: f.limit, ideal: f.ideal ?? null});
      }
    }
    for (const x of fields) {
      x.state = x.count > x.limit ? 'over' : x.ideal && (x.count < x.ideal[0] || x.count > x.ideal[1]) ? 'meh' : 'ok';
      if (x.state === 'over') errors.push(`${pf.name} · ${x.label}: ${x.count}/${x.limit} ตัวอักษร (เกิน)`);
      if (/\{\{[a-z]+\}\}/.test(x.text)) errors.push(`${pf.name} · ${x.label}: มี {{…}} ที่ไม่รู้จัก`);
    }
    const hmax = pf.hashtags?.max ?? 99;
    if (hs.length > hmax) errors.push(`${pf.name}: แฮชแท็ก ${hs.length} อัน (สูงสุด ${hmax})`);
    platforms.push({id: pf.id, name: pf.name, fields, hashtags: hs.map(tagify), hashtagIdeal: pf.hashtags?.ideal ?? null, tips: pf.tips, cover: d.cover ?? null, fit: pf.formats.includes(fmt)});
  }
  if (post.aiDisclosure === undefined) warnings.push('ยังไม่ได้ระบุ aiDisclosure (ต้องติดป้ายเนื้อหา AI ไหม — rules/14)');
  return {exists: true, kit, chapters, sources, platforms, aiDisclosure: post.aiDisclosure ?? null, notes: post.notes ?? null, warnings, errors};
};

/** ไฟล์ markdown พร้อมคัดลอก */
export const toMarkdown = (r) => {
  const L = [`# โพสต์ — ${r.kit.title}`, '', `ความยาว ${r.kit.durationSec ? mmss(r.kit.durationSec) : '?'}${r.kit.durationEstimated ? ' (ประมาณ)' : ''} · ${r.kit.format}${r.aiDisclosure != null ? ` · ติดป้าย AI: ${r.aiDisclosure ? 'ใช่' : 'ไม่ต้อง'}` : ''}`, ''];
  for (const p of r.platforms) {
    L.push(`## ${p.name}${p.cover ? ` · ปก ${p.cover}` : ''}`, '');
    for (const f of p.fields) L.push(`**${f.label}** (${f.count}/${f.limit})`, '', '```', f.text, '```', '');
  }
  return L.join('\n');
};
