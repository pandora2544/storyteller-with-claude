import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Era, Shot} from '../types';
import {Stage} from '../camera/Stage';
import {EraTexture} from '../era/EraTexture';
import {DataLayer} from '../data/Data';
import {SourceLine, Subtitles, TextLayer} from '../text/ThaiText';
import {ERAS} from '../era/eras';
import type {SubMode} from '../text/subchunks';
import {C} from '../theme/tokens';

export const ShotRenderer: React.FC<{shot: Shot; era: Era; dur: number; subtitle: string; subtitleEn?: string; subMode?: SubMode; sources: Record<string, string>; showSubs: boolean}> = ({shot, era, dur, subtitle, subtitleEn, subMode = 'th', sources, showSubs}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const d = dur / fps;
  const ref = (shot.data as any)?.sourceRef ?? shot.text?.find((x) => x.sourceRef)?.sourceRef;
  const isMap = shot.data?.chart === 'map';
  // แผนที่วาดเป็นพื้นหลัง → ตัดเลเยอร์พื้นทึบ (bg-color / ฉากเต็มเฟรม) ที่จะบังแผนที่ออก
  const stageShot = isMap ? {...shot, layers: shot.layers.filter((l) => !(l.cover || l.asset === 'bg-color' || l.asset === 'paper-bg'))} : shot;
  return (
    <AbsoluteFill style={{background: shot.bg ?? C.bgDeep, overflow: 'hidden'}}>
      {isMap && <DataLayer d={shot.data!} t={t} dur={d} fps={fps} era={era} />}
      <Stage shot={stageShot} t={t} dur={d} fps={fps} era={era} />
      <EraTexture era={era} />
      {shot.data && !isMap && <DataLayer d={shot.data} t={t} dur={d} fps={fps} era={era} />}
      <TextLayer items={shot.text} t={t} fps={fps} vintage={ERAS[era].vintage} />
      <SourceLine text={ref ? sources[ref] : undefined} />
      {showSubs && subMode !== 'off' && <Subtitles text={subtitle} textEn={subtitleEn} mode={subMode} t={t} dur={d} />}
    </AbsoluteFill>
  );
};
