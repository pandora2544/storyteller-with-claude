import React from 'react';
import {CalculateMetadataFunction, Composition, Still, staticFile} from 'remotion';
import '@fontsource/kanit/500.css';
import '@fontsource/kanit/600.css';
import '@fontsource/kanit/700.css';
import '@fontsource/ibm-plex-sans-thai/400.css';
import '@fontsource/ibm-plex-sans-thai/500.css';
import '@fontsource/ibm-plex-sans-thai/600.css';
import '@fontsource/mali/600.css';
import '@fontsource/mali/700.css';
import {Main, MainProps, transitionFrames} from './Main';
import {resolveTimeline, VoTiming} from './timing/resolve';
import type {Project} from './types';
import {ShotRenderer} from './shots/ShotRenderer';
import {CoverStill} from './cover/Cover';
import {FormatContext, formatOf, ImagesContext} from './format';
// ตัวอย่างจาก templates/ (projects/ ไม่อยู่ใน repo) — โปรเจกต์จริงส่งเข้ามาผ่าน --props
import sample from '../templates/shots.example.json';

const SAMPLE = sample as unknown as Project;
const PROJECTS: Record<string, Project> = {};

const calc: CalculateMetadataFunction<MainProps> = async ({props}) => {
  const p = props.project;
  const vo: Record<string, VoTiming | null> = {};
  let haveAll = true;
  for (const s of p.scenes) {
    try {
      const r = await fetch(staticFile(`${p.meta.slug}/${s.voFile.replace(/\.(mp3|wav)$/, '.json')}`));
      vo[s.id] = r.ok ? await r.json() : null;
    } catch {
      vo[s.id] = null;
    }
    if (!vo[s.id]) haveAll = false;
  }
  const timeline = resolveTimeline(p, vo, (i) => transitionFrames(p, i + 1 < p.scenes.length ? i + 1 : 0));
  const overlap = p.scenes.reduce((a, _, i) => a + transitionFrames(p, i), 0);
  const f = formatOf(p);
  return {durationInFrames: timeline.total - overlap, width: f.width, height: f.height, props: {...props, timeline, withAudio: haveAll}};
};
/** ขนาดเฟรมของ shot/cover ตาม format ของโปรเจกต์ (แนวนอน 1920×1080 · แนวตั้ง 1080×1920) */
const dims: CalculateMetadataFunction<{project: Project}> = ({props}) => {
  const f = formatOf(props.project);
  return {width: f.width, height: f.height};
};

/** พรีวิวทีละช็อต (dev/QA): --props='{"shotId":"S03-05"}' */
const ShotPreview: React.FC<{shotId: string; project: Project}> = ({shotId, project}) => {
  const scene = project.scenes.find((s) => s.shots.some((x) => x.id === shotId))!;
  const shot = scene.shots.find((x) => x.id === shotId)!;
  return (
    <FormatContext.Provider value={formatOf(project)}>
      <ImagesContext.Provider value={project.images ?? {}}>
        <ShotRenderer shot={shot} era={scene.era} dur={120} subtitle="" sources={project.sources} showSubs={false} />
      </ImagesContext.Provider>
    </FormatContext.Provider>
  );
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="shot" component={ShotPreview as any} fps={30} width={1920} height={1080} durationInFrames={120}
      defaultProps={{shotId: 'S01-01', project: SAMPLE}} calculateMetadata={dims as any} />
    {/* ปก YouTube (rule 12): --props='{"coverId":"B"}' */}
    <Still id="cover" component={CoverStill as any} width={1920} height={1080}
      defaultProps={{coverId: 'A', project: SAMPLE}} calculateMetadata={dims as any} />
    {/* โปรเจกต์ใดก็ได้ผ่าน props (HistoryTeller: --props=out/.props-<slug>.json) */}
    <Composition
      id="project"
      component={Main}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={180 * 30}
      defaultProps={{project: SAMPLE, timeline: null, showSubs: true, withAudio: false}}
      calculateMetadata={calc}
    />
    {Object.entries(PROJECTS).map(([slug, project]) => (
      <Composition
        key={slug}
        id={slug}
        component={Main}
        fps={project.meta.fps}
        width={project.meta.width}
        height={project.meta.height}
        durationInFrames={project.meta.targetSec * project.meta.fps}
        defaultProps={{project, timeline: null, showSubs: true, withAudio: false}}
        calculateMetadata={calc}
      />
    ))}
  </>
);
