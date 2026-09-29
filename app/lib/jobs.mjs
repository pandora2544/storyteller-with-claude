// รันคำสั่งของ pipeline บนเครื่องนี้ — เฉพาะคำสั่งใน whitelist, ทีละงาน, log สดผ่าน SSE
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {P, loadShots, validSlug, writeAtomic} from './project.mjs';
import {imagesSpec} from '../../scripts/lib/images.mjs';

const remotionBin = () => (fs.existsSync(P('node_modules', '.bin', 'remotion')) ? [P('node_modules', '.bin', 'remotion')] : ['npx', 'remotion']);
const python = () => process.env.HT_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');

/** แต่ละ job = ลำดับของคำสั่ง [bin, args, env?] (ไม่ผ่าน shell) */
export const JOBS = {
  validate: {label: 'ตรวจ shots.json', steps: (slug) => [['node', ['scripts/validate.mjs', `projects/${slug}`]]]},
  tts: {
    label: 'สร้างเสียงพากย์', needsNet: true,
    steps: (slug, {scene} = {}) => [[python(), ['scripts/tts.py', `projects/${slug}/shots.json`, ...(scene ? ['--scene', scene] : [])]]],
  },
  stills: {label: 'ภาพนิ่งทุกช็อต', steps: (slug) => [['node', ['scripts/stills.mjs', '60'], {HT_SLUG: slug}]]},
  render: {
    label: 'Render วิดีโอ + master เสียง',
    // scripts/render.mjs: props จาก shots.json + settings (อัตราพูด, เพลง/SFX) → composition "project" → master
    steps: (slug) => [['node', ['scripts/render.mjs', slug]]],
  },
  imagegen: {
    label: 'สร้างภาพ AI', needsNet: true,
    steps: (slug, {image, force} = {}) => [[python(), ['scripts/imagegen.py', slug, ...(image ? ['--only', image] : []), ...(force ? ['--force'] : [])]]],
  },
  subs: {label: 'ไฟล์ซับ .srt/.vtt', steps: (slug) => [['node', ['scripts/subs.mjs', slug]]]},
  master: {label: 'ปรับเสียง −14 LUFS', steps: (slug) => [['node', ['scripts/master.mjs', `out/${slug}.mp4`]]]},
  cover: {label: 'Render ปก YouTube', steps: (slug) => [['node', ['scripts/cover.mjs', slug]]]},
  post: {label: 'ส่งออกข้อความโพสต์ (.md)', steps: (slug) => [['node', ['scripts/post.mjs', slug]]]},
  eras: {label: 'ภาพตัวอย่างทุกยุค', steps: () => [['node', ['scripts/era-sheet.mjs']]]},
  audition: {
    label: 'ลองเสียง (audition)', needsNet: true,
    steps: (slug, {preset} = {}) => [[python(), ['scripts/tts.py', '--audition', '--slug', slug, ...(preset ? ['--preset', preset] : [])]]],
  },
};

const MAX_LOG = 400_000;
const jobs = [];
let seq = 0;
let listener = () => {};
export const onJobEvent = (fn) => { listener = fn; };
export const listJobs = () => jobs.map((j) => ({...pub(j), logTail: j.log.slice(-4000)}));
export const getJob = (id) => jobs.find((j) => j.id === id);
export const running = () => jobs.find((j) => j.status === 'running');

const pub = ({proc, log, ...j}) => j;
const append = (job, text) => {
  job.log += text;
  if (job.log.length > MAX_LOG) job.log = '…(ตัดช่วงต้น)…\n' + job.log.slice(-MAX_LOG);
  listener({type: 'job-log', id: job.id, text});
};

export const startJob = (slug, name, opts = {}) => {
  if (!validSlug(slug) || !fs.existsSync(P('projects', slug))) throw new Error('ไม่พบโปรเจกต์ ' + slug);
  const def = JOBS[name];
  if (!def) throw new Error('ไม่รู้จักงาน ' + name);
  if (running()) throw new Error('มีงานกำลังรันอยู่: ' + running().name);
  if (opts.preset && !/^[a-z0-9][a-z0-9-]*$/.test(opts.preset)) throw new Error('preset ไม่ถูกต้อง');
  if (opts.image) {
    const ok = (imagesSpec(slug)?.images ?? []).some((x) => x.id === opts.image);
    if (!ok) throw new Error('ไม่พบรูป ' + opts.image + ' ใน images.json');
  }
  if (opts.scene) {
    const ok = (loadShots(slug)?.scenes ?? []).some((s) => s.id === opts.scene);
    if (!ok) throw new Error('ไม่พบซีน ' + opts.scene);
  }
  const job = {id: `job-${++seq}`, slug, name, label: def.label + (opts.preset ? ` · ${opts.preset}` : '') + (opts.image ? ` · ${opts.image}` : ''), scene: opts.scene ?? null, status: 'running', startedAt: Date.now(), endedAt: null, exitCode: null, log: ''};
  jobs.unshift(job);
  if (jobs.length > 30) jobs.pop();
  listener({type: 'job', job: pub(job)});
  (async () => {
    try {
      def.prepare?.(slug);
      for (const [bin, args, env] of def.steps(slug, opts)) {
        append(job, `$ ${[bin.replace(P() + '/', ''), ...args].join(' ')}\n`);
        const code = await new Promise((resolve) => {
          const p = spawn(bin, args, {cwd: P(), env: {...process.env, FORCE_COLOR: '0', PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', ...(env ?? {})}});
          job.proc = p;
          p.stdout.on('data', (d) => append(job, d.toString()));
          p.stderr.on('data', (d) => append(job, d.toString()));
          p.on('error', (e) => { append(job, `✗ เรียก ${bin} ไม่ได้: ${e.message}\n`); resolve(-1); });
          p.on('close', (c) => resolve(c));
        });
        job.exitCode = code;
        if (code !== 0) throw new Error(`จบด้วยรหัส ${code}`);
      }
      job.status = 'ok';
    } catch (e) {
      job.status = job.status === 'cancelled' ? 'cancelled' : 'error';
      append(job, `\n✗ ${e.message}\n`);
    } finally {
      job.endedAt = Date.now();
      delete job.proc;
      listener({type: 'job', job: pub(job)});
    }
  })();
  return pub(job);
};

export const cancelJob = (id) => {
  const j = getJob(id);
  if (!j || j.status !== 'running') throw new Error('ไม่มีงานนี้กำลังรัน');
  j.status = 'cancelled';
  j.proc?.kill('SIGTERM');
  return true;
};
