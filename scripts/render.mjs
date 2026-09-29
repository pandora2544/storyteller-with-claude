// Render โปรเจกต์ใดก็ได้ตาม settings.json → out/<slug>.mp4 แล้ว master เสียง → out/<slug>-master.mp4
// node scripts/render.mjs <slug> [--no-master]
// ใช้ composition "project" + props (shots.json + settings ที่ resolve แล้ว: อัตราพูด, เพลง/SFX)
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadSettings, resolve, budget} from './lib/settings.mjs';
import {imagesMap} from './lib/images.mjs';

const slug = process.argv[2];
if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
  console.error('ใช้: node scripts/render.mjs <slug>');
  process.exit(1);
}
export const buildProps = (s) => {
  const project = JSON.parse(fs.readFileSync(`projects/${s}/shots.json`, 'utf8'));
  const r = resolve(loadSettings(s));
  project.images = imagesMap(s);
  project.settings = {
    targetSec: r.targetSec,
    subtitles: r.subtitles,
    voice: {id: r.voice.id, charsPerSec: budget(r).charsPerSec}, // รวม tts.tempo แล้ว
    style: {id: r.style.id},
    format: {id: r.format.id, width: r.format.width, height: r.format.height, fps: r.format.fps, safe: r.format.safe, subtitle: r.format.subtitle},
    audio: r.style.audio ?? null,
  };
  return {project, timeline: null, showSubs: r.style.subtitles !== false && r.subtitles !== 'off', withAudio: false};
};
const propsFile = `out/.props-${slug}.json`;
fs.mkdirSync('out', {recursive: true});
fs.writeFileSync(propsFile, JSON.stringify(buildProps(slug)));
const WIN = process.platform === 'win32';
const localBin = path.join('node_modules', '.bin', WIN ? 'remotion.cmd' : 'remotion');
const bin = fs.existsSync(localBin) ? localBin : 'npx';
const pre = bin === 'npx' ? ['remotion'] : [];
const run = (b, args) => {
  console.log(`$ ${[b, ...args].join(' ')}`);
  const r = spawnSync(b, args, {stdio: 'inherit', shell: WIN});
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(bin, [...pre, 'render', 'src/index.ts', 'project', `out/${slug}.mp4`, '--codec', 'h264', '--crf', '18', `--props=${propsFile}`]);
if (!process.argv.includes('--no-master')) run('node', ['scripts/master.mjs', `out/${slug}.mp4`]);
run('node', ['scripts/subs.mjs', slug]);
